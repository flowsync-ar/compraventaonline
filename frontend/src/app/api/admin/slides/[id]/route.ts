import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"
import type { TablesUpdate } from "@/lib/supabase/types"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params

  let body: {
    imageUrl?: string
    eyebrow?: string
    title?: string
    ctaLabel?: string
    href?: string
    active?: boolean
    sortOrder?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const admin = createAdminClient()

  const updates: TablesUpdate<"hero_slides"> = {}
  if (body.imageUrl?.trim()) updates.image_url = body.imageUrl.trim()
  if (body.eyebrow !== undefined) updates.eyebrow = body.eyebrow.trim()
  if (body.title?.trim()) updates.title = body.title.trim()
  if (body.ctaLabel !== undefined) updates.cta_label = body.ctaLabel.trim() || "Ver más"
  if (body.href !== undefined) updates.href = body.href.trim() || "/search"
  if (body.active !== undefined) updates.active = body.active
  if (body.sortOrder !== undefined) updates.sort_order = body.sortOrder

  const { data, error } = await admin
    .from("hero_slides")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ slide: data })
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params

  const admin = createAdminClient()
  const { error } = await admin.from("hero_slides").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
