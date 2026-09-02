import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { validateParentId } from "@/lib/admin/categories"
import type { TablesUpdate } from "@/lib/supabase/types"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params

  let body: { name?: string; slug?: string; icon?: string; parentId?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const admin = createAdminClient()

  const updates: TablesUpdate<"categories"> = {}
  if (body.name?.trim()) updates.name = body.name.trim()
  if (body.slug?.trim()) updates.slug = body.slug.trim()
  if (body.icon !== undefined) updates.icon = body.icon?.trim() || null
  if (body.parentId !== undefined) {
    const parentCheck = await validateParentId(admin, body.parentId, id)
    if (!parentCheck.ok) {
      return NextResponse.json({ error: parentCheck.error }, { status: 400 })
    }
    updates.parent_id = body.parentId || null
  }

  const { data, error } = await admin
    .from("categories")
    .update(updates)
    .eq("id", id)
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

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params

  const admin = createAdminClient()
  const { error } = await admin.from("categories").delete().eq("id", id)

  if (error) {
    const message =
      error.code === "23503"
        ? "No se puede borrar: tiene subcategorías. Borralas o reasignalas primero."
        : error.message
    return NextResponse.json({ error: message }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
