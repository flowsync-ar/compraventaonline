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
    imageUrlMobile?: string
    eyebrow?: string
    title?: string
    ctaLabel?: string
    href?: string
    active?: boolean
    darkOverlay?: boolean
    imageFit?: "cover" | "contain"
    showCta?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const imageUrl = body.imageUrl?.trim()
  const title = body.title?.trim() || null

  if (!imageUrl) {
    return NextResponse.json({ error: "La imagen es obligatoria" }, { status: 400 })
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
    image_url_mobile: body.imageUrlMobile?.trim() || null,
    eyebrow: body.eyebrow?.trim() || "",
    title,
    cta_label: body.ctaLabel?.trim() || "Ver más",
    href: body.href?.trim() || "/search",
    active: body.active ?? true,
    dark_overlay: body.darkOverlay ?? true,
    image_fit: body.imageFit === "contain" ? "contain" : "cover",
    show_cta: body.showCta ?? true,
    sort_order: nextOrder,
  }

  const { data, error } = await admin.from("hero_slides").insert(insert).select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ slide: data })
}
