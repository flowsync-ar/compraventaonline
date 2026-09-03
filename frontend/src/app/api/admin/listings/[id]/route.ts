import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { isRichHtmlEmpty, sanitizeRichHtml } from "@/lib/richText"
import { normalizeListingTitle } from "@/lib/listingTitle"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params
  let body: { categoryId?: string | null; images?: string[]; price?: number; description?: string; name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  if (
    body.categoryId === undefined &&
    body.images === undefined &&
    body.price === undefined &&
    body.description === undefined &&
    body.name === undefined
  ) {
    return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("id, product_id")
    .eq("id", id)
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 })
  }

  let product = null

  if (body.categoryId !== undefined) {
    const categoryId = body.categoryId?.trim() || null
    if (categoryId) {
      const { data: category, error: categoryError } = await admin
        .from("categories")
        .select("id")
        .eq("id", categoryId)
        .single()
      if (categoryError || !category) {
        return NextResponse.json({ error: "La categoría no existe." }, { status: 400 })
      }
    }
    const { data, error: productError } = await admin
      .from("products")
      .update({ category_id: categoryId })
      .eq("id", listing.product_id)
      .select("id, category_id, images, categories(id, name, parent_id)")
      .single()
    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 400 })
    }
    product = data
  }

  if (body.images !== undefined) {
    if (!Array.isArray(body.images) || body.images.some((u) => typeof u !== "string")) {
      return NextResponse.json({ error: "Las fotos no son válidas." }, { status: 400 })
    }
    const images = body.images.map((u) => u.trim()).filter(Boolean)
    const { data, error: imagesError } = await admin
      .from("products")
      .update({ images })
      .eq("id", listing.product_id)
      .select("id, category_id, images, categories(id, name, parent_id)")
      .single()
    if (imagesError) {
      return NextResponse.json({ error: imagesError.message }, { status: 400 })
    }
    product = data
    const { error: coverError } = await admin
      .from("listings")
      .update({ image_url: images[0] ?? null })
      .eq("id", id)
    if (coverError) {
      return NextResponse.json({ error: coverError.message }, { status: 400 })
    }
  }

  if (body.price !== undefined) {
    const price = Number(body.price)
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "El precio tiene que ser un número mayor a 0." }, { status: 400 })
    }
    const { error: priceError } = await admin.from("listings").update({ price }).eq("id", id)
    if (priceError) {
      return NextResponse.json({ error: priceError.message }, { status: 400 })
    }
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      return NextResponse.json({ error: "La descripción no es válida." }, { status: 400 })
    }
    const description = isRichHtmlEmpty(body.description) ? "" : sanitizeRichHtml(body.description)
    const { data, error: descriptionError } = await admin
      .from("products")
      .update({ description })
      .eq("id", listing.product_id)
      .select("id, category_id, images, description, categories(id, name, parent_id)")
      .single()
    if (descriptionError) {
      return NextResponse.json({ error: descriptionError.message }, { status: 400 })
    }
    product = data
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string") {
      return NextResponse.json({ error: "El título no es válido." }, { status: 400 })
    }
    const name = normalizeListingTitle(body.name)
    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: "El título debe tener entre 2 y 80 caracteres." }, { status: 400 })
    }
    const { data, error: nameError } = await admin
      .from("products")
      .update({ name })
      .eq("id", listing.product_id)
      .select("id, name, category_id, images, description, categories(id, name, parent_id)")
      .single()
    if (nameError) {
      return NextResponse.json({ error: nameError.message }, { status: 400 })
    }
    product = data
  }

  return NextResponse.json({
    ok: true,
    product,
    image_url: product?.images?.[0] ?? null,
    price: body.price,
  })
}

// Hard delete — mirrors the same operation sellers can already do on their
// own listings from the dashboard (frontend/src/app/dashboard/page.tsx,
// handleDeleteListing). Listings have no soft-delete/undo concept in the UI.
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params
  const admin = createAdminClient()

  const { error } = await admin.from("listings").delete().eq("id", id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
