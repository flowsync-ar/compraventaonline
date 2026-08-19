import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"
import type { TablesInsert } from "@/lib/supabase/types"

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("hero_slides")
    .select("*")
    .order("sort_order", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ slides: data })
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: {
    imageUrl?: string
    eyebrow?: string
    title?: string
    ctaLabel?: string
    href?: string
    active?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const imageUrl = body.imageUrl?.trim()
  const title = body.title?.trim()

  if (!imageUrl || !title) {
    return NextResponse.json({ error: "La imagen y el título son obligatorios" }, { status: 400 })
  }

  const admin = createAdminClient()

  // New slide goes to the end of the order.
  const { data: existing } = await admin
    .from("hero_slides")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (existing?.sort_order ?? -1) + 1

  const insert: TablesInsert<"hero_slides"> = {
    image_url: imageUrl,
    eyebrow: body.eyebrow?.trim() || "",
    title,
    cta_label: body.ctaLabel?.trim() || "Ver más",
    href: body.href?.trim() || "/search",
    active: body.active ?? true,
    sort_order: nextOrder,
  }

  const { data, error } = await admin.from("hero_slides").insert(insert).select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ slide: data })
}
