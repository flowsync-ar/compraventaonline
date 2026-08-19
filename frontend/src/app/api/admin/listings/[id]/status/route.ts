import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

// listing_status enum only has ACTIVE/APPROVED/PAUSED/SOLD/DELETED — there's
// no separate "suspended" state, so admin pause/reactivate uses the same
// PAUSED status a seller can already set from their own dashboard.
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params

  let body: { action?: "pause" | "reactivate" }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  if (body.action !== "pause" && body.action !== "reactivate") {
    return NextResponse.json({ error: "action debe ser 'pause' o 'reactivate'" }, { status: 400 })
  }

  const status = body.action === "pause" ? "PAUSED" : "ACTIVE"

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("listings")
    .update({ status })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ listing: data })
}
