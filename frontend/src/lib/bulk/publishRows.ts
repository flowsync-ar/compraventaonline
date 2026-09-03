import type { TablesInsert } from "@/lib/supabase/types"
import type { createAdminClient } from "@/lib/supabase/admin"
import { validateBulkRowFields, validateCategoryId, type BulkRowInput } from "@/lib/bulk/validateRow"
import { communityLanguageRejection } from "@/lib/communityLanguage"
import { normalizeListingTitle } from "@/lib/listingTitle"
import { analyzePrice } from "@/lib/priceIntegrity/analyzePrice"
import { PRICE_INTEGRITY_EVENT, PRICE_RISK } from "@/lib/priceIntegrity/types"

export interface ConfirmRow extends BulkRowInput {
  categoryId?: string | null
  images?: string[]
}

export interface FailedRow {
  row: number
  reason: string
}

type NewProduct = TablesInsert<"products">
type NewListing = Omit<TablesInsert<"listings">, "product_id" | "seller_id">

export async function publishBulkRows(
  admin: ReturnType<typeof createAdminClient>,
  sellerId: string,
  rows: ConfirmRow[],
): Promise<{ inserted: number; failed: FailedRow[] }> {
  const [{ data: categories }, { data: currencies }] = await Promise.all([
    admin.from("categories").select("id, slug, name"),
    admin.from("currencies").select("id, code"),
  ])
  const categoriesById = new Map((categories ?? []).map((c) => [c.id, { slug: c.slug, name: c.name }]))
  const currencyIdByCode = new Map((currencies ?? []).map((c) => [c.code, c.id]))

  const failed: FailedRow[] = []
  let inserted = 0

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 1
    const fields = validateBulkRowFields(rows[i])
    if (!fields.valid) {
      failed.push({ row: rowNumber, reason: fields.reason })
      continue
    }

    const category = validateCategoryId(rows[i].categoryId, categoriesById)
    if (!category.valid) {
      failed.push({ row: rowNumber, reason: category.reason })
      continue
    }

    const languageError = communityLanguageRejection(fields.name, fields.brand, fields.description)
    if (languageError) {
      failed.push({ row: rowNumber, reason: languageError })
      continue
    }

    const currencyId = currencyIdByCode.get(fields.currencyCode)
    if (!currencyId) {
      failed.push({ row: rowNumber, reason: `No se encontró la moneda ${fields.currencyCode} en la base` })
      continue
    }

    const images = Array.isArray(rows[i].images)
      ? rows[i].images!.filter((u): u is string => typeof u === "string" && u.trim().length > 0)
      : []

    const product: NewProduct = {
      name: normalizeListingTitle(fields.name),
      brand: fields.brand,
      description: fields.description,
      category_id: category.categoryId,
      images: images.length > 0 ? images : null,
      attributes: fields.attributes,
    }

    const { data: productData, error: productError } = await admin
      .from("products")
      .insert(product)
      .select("id")
      .single()

    if (productError || !productData) {
      failed.push({ row: rowNumber, reason: productError?.message ?? "No se pudo crear el producto" })
      continue
    }

    const listing: NewListing = {
      price: fields.price,
      currency_id: currencyId,
      condition: fields.condition,
      stock: fields.stock,
      featured_plan: "FREE",
      status: "APPROVED",
      image_url: images[0] ?? null,
    }

    const { data: listingRow, error: listingError } = await admin
      .from("listings")
      .insert({
        ...listing,
        product_id: productData.id,
        seller_id: sellerId,
      })
      .select("id")
      .single()

    if (listingError) {
      failed.push({ row: rowNumber, reason: listingError.message })
      continue
    }

    const analysis = analyzePrice({ price: fields.price })
    if (analysis.risk !== PRICE_RISK.NORMAL && listingRow) {
      await admin.from("price_integrity_events").insert({
        listing_id: listingRow.id,
        seller_id: sellerId,
        event_type:
          analysis.risk === PRICE_RISK.HIGH
            ? PRICE_INTEGRITY_EVENT.HIGH_RISK_DETECTED
            : PRICE_INTEGRITY_EVENT.WARNING_SHOWN,
        risk: analysis.risk,
        reasons: analysis.reasons,
      })
    }

    inserted++
  }

  return { inserted, failed }
}
