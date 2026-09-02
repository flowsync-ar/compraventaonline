import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params
  let body: { categoryId?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  if (body.categoryId === undefined) {
    return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 })
  }

  const admin = createAdminClient()
  const categoryId = body.categoryId?.trim() || null

  if (categoryId) {
    const { data: category, error: categoryError } = await admin
      .from("categories")
      .select("id, name, parent_id")
      .eq("id", categoryId)
      .single()
    if (categoryError || !category) {
      return NextResponse.json({ error: "La categoría no existe." }, { status: 400 })
    }
  }

  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("id, product_id")
    .eq("id", id)
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 })
  }

  const { data: product, error: productError } = await admin
    .from("products")
    .update({ category_id: categoryId })
    .eq("id", listing.product_id)
    .select("id, category_id, categories(id, name, parent_id)")
    .single()

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, product })
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
