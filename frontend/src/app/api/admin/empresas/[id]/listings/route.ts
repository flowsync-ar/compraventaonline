import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeListingTitle } from "@/lib/listingTitle"
import { MAX_LISTING_IMAGES } from "@/lib/listingImages"

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id: sellerId } = await context.params
  const form = await request.formData()
  const name = normalizeListingTitle(String(form.get("name") ?? ""))
  const priceRaw = String(form.get("price") ?? "").replace(/\./g, "").replace(",", ".")
  const price = Number(priceRaw)
  const stock = Math.max(1, parseInt(String(form.get("stock") ?? "1"), 10) || 1)
  const categoryId = String(form.get("categoryId") ?? "").trim() || null
  const currencyId = String(form.get("currencyId") ?? "").trim() || null
  const brand = String(form.get("brand") ?? "").trim() || null
  const description = String(form.get("description") ?? "").trim()
  const files = form
    .getAll("files")
    .filter((item): item is File => item instanceof File && item.size > 0)
    .slice(0, MAX_LISTING_IMAGES)

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "El título debe tener entre 2 y 80 caracteres." }, { status: 400 })
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Ingresá un precio válido." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: company, error: companyError } = await admin
    .from("sellers")
    .select("id")
    .eq("id", sellerId)
    .eq("partner", true)
    .single()
  if (companyError || !company) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
  }

  const descriptionHtml = description
    ? `<p>${escapeHtml(description).replace(/\n/g, "<br/>")}</p>`
    : ""

  const { data: product, error: productError } = await admin
    .from("products")
    .insert({
      name,
      brand,
      description: descriptionHtml,
      category_id: categoryId,
      images: [],
    })
    .select("id")
    .single()

  if (productError || !product) {
    return NextResponse.json({ error: productError?.message ?? "No se pudo crear el producto." }, { status: 400 })
  }

  const { data: listing, error: listingError } = await admin
    .from("listings")
    .insert({
      product_id: product.id,
      seller_id: sellerId,
      price,
      stock,
      condition: "NEW",
      featured_plan: "FREE",
      currency_id: currencyId,
      image_url: null,
      status: "APPROVED",
    })
    .select("id")
    .single()

  if (listingError || !listing) {
    await admin.from("products").delete().eq("id", product.id)
    return NextResponse.json({ error: listingError?.message ?? "No se pudo crear la publicación." }, { status: 400 })
  }

  const uploaded: string[] = []
  for (const file of files) {
    const safeName = file.name.replace(/[^\w.-]+/g, "-") || "foto.webp"
    const path = `${sellerId}/${listing.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`
    const { error: uploadError } = await admin.storage.from("listings").upload(path, file, {
      upsert: false,
      cacheControl: "31536000",
      contentType: file.type || "image/webp",
    })
    if (uploadError) {
      console.error("[admin empresas listings]", uploadError.message)
      continue
    }
    const { data: urlData } = admin.storage.from("listings").getPublicUrl(path)
    if (urlData?.publicUrl) uploaded.push(urlData.publicUrl)
  }

  if (uploaded.length > 0) {
    await admin.from("products").update({ images: uploaded }).eq("id", product.id)
    await admin.from("listings").update({ image_url: uploaded[0] }).eq("id", listing.id)
  }

  return NextResponse.json({ ok: true, listingId: listing.id })
}
