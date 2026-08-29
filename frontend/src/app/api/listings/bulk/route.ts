import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TablesInsert } from '@/lib/supabase/types'
import { validateBulkRowFields, validateCategoryId, type BulkRowInput } from '@/lib/bulk/validateRow'
import { communityLanguageRejection } from '@/lib/communityLanguage'

interface ConfirmRow extends BulkRowInput {
  categoryId?: string | null
  images?: string[]
}

interface FailedRow {
  row: number
  reason: string
}

type NewProduct = TablesInsert<'products'>
type NewListing = Omit<TablesInsert<'listings'>, 'product_id' | 'seller_id'>

// ============================================================
// POST /api/listings/bulk
// Accepts: { rows: ConfirmRow[] } — already reviewed in the preview step
// (POST /api/listings/bulk/preview): the seller picked a category per row
// from a dropdown and attached photos via drag-and-drop straight to
// Supabase Storage (same bucket/pattern as the single-listing flow), so
// `categoryId` and `images` arrive already resolved here.
//
// Every row is still re-validated from scratch — never trusts the
// client's "valid" flag, only the raw fields + categoryId — before
// creating a `products` row + a `listings` row per valid entry.
// Returns: { inserted: number, failed: Array<{row, reason}> }
// ============================================================
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: sellerRow, error: sellerError } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (sellerError || !sellerRow) {
    return NextResponse.json({ error: 'Esta acción es solo para vendedores' }, { status: 403 })
  }

  const sellerId = sellerRow.id

  let rows: ConfirmRow[]
  try {
    const body = await req.json()
    rows = Array.isArray(body?.rows) ? body.rows : []
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No hay filas para publicar' }, { status: 400 })
  }

  const admin = createAdminClient()
  const [{ data: categories }, { data: currencies }] = await Promise.all([
    admin.from('categories').select('id, slug, name'),
    admin.from('currencies').select('id, code'),
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
      // Shouldn't happen (ARS/USD are seeded in 001_initial.sql), but a
      // missing currency row must not silently fall back to the wrong one.
      failed.push({ row: rowNumber, reason: `No se encontró la moneda ${fields.currencyCode} en la base` })
      continue
    }

    const images = Array.isArray(rows[i].images)
      ? rows[i].images!.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
      : []

    const product: NewProduct = {
      name: fields.name,
      brand: fields.brand,
      description: fields.description,
      category_id: category.categoryId,
      images: images.length > 0 ? images : null,
      attributes: fields.attributes,
    }

    const { data: productData, error: productError } = await admin
      .from('products')
      .insert(product)
      .select('id')
      .single()

    if (productError || !productData) {
      failed.push({ row: rowNumber, reason: productError?.message ?? 'No se pudo crear el producto' })
      continue
    }

    const listing: NewListing = {
      price: fields.price,
      currency_id: currencyId,
      condition: fields.condition,
      stock: fields.stock,
      featured_plan: 'FREE',
      status: 'APPROVED',
      image_url: images[0] ?? null,
    }

    const { error: listingError } = await admin.from('listings').insert({
      ...listing,
      product_id: productData.id,
      seller_id: sellerId,
    })

    if (listingError) {
      failed.push({ row: rowNumber, reason: listingError.message })
      continue
    }

    inserted++
  }

  return NextResponse.json({ inserted, failed })
}
