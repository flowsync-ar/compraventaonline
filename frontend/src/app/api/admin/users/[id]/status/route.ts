import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

// "Indefinite" ban — Supabase Auth doesn't support ban_duration: 'none' for
// banning (that value only means "unban"), so we use a very long duration.
const INDEFINITE_BAN = "876000h" // ~100 years

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params

  let body: { action?: "suspend" | "reactivate" }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  if (body.action !== "suspend" && body.action !== "reactivate") {
    return NextResponse.json({ error: "action debe ser 'suspend' o 'reactivate'" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: seller, error: sellerError } = await admin
    .from("sellers")
    .select("user_id")
    .eq("id", id)
    .single()

  if (sellerError || !seller) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const banDuration = body.action === "suspend" ? INDEFINITE_BAN : "none"

  const { error: banError } = await admin.auth.admin.updateUserById(seller.user_id, {
    ban_duration: banDuration,
  })

  if (banError) {
    return NextResponse.json({ error: banError.message }, { status: 500 })
  }

  const status = body.action === "suspend" ? "SUSPENDED" : "ACTIVE"
  const { data, error } = await admin
    .from("sellers")
    .update({ status })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ user: data })
}
