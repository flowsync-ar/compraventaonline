import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

const SELECT =
  "id, user_id, name, email, phone, location, address, instagram, website, bio, avatar_url, username, document_number, partner, type, status, created_at"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params
  const admin = createAdminClient()
  const { data: company, error } = await admin.from("sellers").select(SELECT).eq("id", id).eq("partner", true).single()
  if (error || !company) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
  }

  const { data: listings } = await admin
    .from("listings")
    .select("id, price, stock, status, image_url, created_at, products(name, images, categories(name)), currencies(symbol)")
    .eq("seller_id", id)
    .order("created_at", { ascending: false })

  const { data: currencies } = await admin.from("currencies").select("id, code, symbol").order("code")
  const { data: categories } = await admin.from("categories").select("id, name, parent_id").order("name")

  return NextResponse.json({ company, listings: listings ?? [], currencies: currencies ?? [], categories: categories ?? [] })
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params
  let body: {
    name?: string
    phone?: string
    location?: string
    address?: string
    instagram?: string
    website?: string
    bio?: string
    username?: string
    documentNumber?: string | null
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const name = body.name?.trim()
  const phone = body.phone?.trim()
  if (!name || !phone) {
    return NextResponse.json({ error: "Nombre y teléfono son obligatorios." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("sellers")
    .update({
      name,
      phone,
      location: body.location?.trim() || null,
      address: body.address?.trim() || null,
      instagram: body.instagram?.trim() || null,
      website: body.website?.trim() || null,
      bio: body.bio?.trim() || null,
      ...(body.username?.trim() ? { username: body.username.trim().toLowerCase() } : {}),
      ...(body.documentNumber !== undefined
        ? { document_number: body.documentNumber?.trim() || null }
        : {}),
    })
    .eq("id", id)
    .eq("partner", true)
    .select(SELECT)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "No se pudo guardar." }, { status: 400 })
  }
  return NextResponse.json({ company: data })
}
