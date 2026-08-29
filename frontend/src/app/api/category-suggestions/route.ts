import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSeller } from "@/lib/supabase/seller-guard"

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const seller = await requireSeller(supabase)
  if (!seller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: { name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const name = (body.name ?? "").trim().replace(/\s+/g, " ")
  if (name.length < 2) {
    return NextResponse.json({ error: "Escribí al menos 2 caracteres" }, { status: 400 })
  }
  if (name.length > 80) {
    return NextResponse.json({ error: "El nombre es demasiado largo" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("category_suggestions")
    .select("id")
    .eq("seller_id", seller.sellerId)
    .eq("status", "PENDING")
    .ilike("suggested_name", name)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, already: true })
  }

  const { error } = await admin.from("category_suggestions").insert({
    seller_id: seller.sellerId,
    suggested_name: name,
    status: "PENDING",
  })

  if (error) {
    console.error("[category-suggestions] insert failed", error)
    return NextResponse.json({ error: "No se pudo enviar la propuesta" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
