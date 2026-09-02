import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { allocateUniqueSlug, validateParentId } from "@/lib/admin/categories"

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from("categories").select("*").order("name")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ categories: data })
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: { name?: string; slug?: string; icon?: string; parentId?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const name = body.name?.trim()
  const icon = body.icon?.trim() || null
  const parentId = body.parentId || null

  if (!name) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
  }

  const admin = createAdminClient()

  const parentCheck = await validateParentId(admin, parentId)
  if (!parentCheck.ok) {
    return NextResponse.json({ error: parentCheck.error }, { status: 400 })
  }

  const slug = body.slug?.trim() || (await allocateUniqueSlug(admin, name, parentId))

  const { data, error } = await admin
    .from("categories")
    .insert({ name, slug, icon, parent_id: parentId })
    .select()
    .single()

  if (error) {
    const message =
      error.code === "23505"
        ? "Ya existe una categoría con ese nombre en el mismo nivel, o el enlace interno está ocupado."
        : error.message
    return NextResponse.json({ error: message }, { status: 400 })
  }
  return NextResponse.json({ category: data })
}
