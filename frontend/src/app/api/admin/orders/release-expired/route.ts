import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

// ============================================================
// POST /api/admin/orders/release-expired
// Manual trigger for the "release after the window lapses" half of the
// escrow policy (see 022_escrow_payments.sql / TermsAcceptanceModal's
// "Liberación de Fondos" clause) — releases every EN_CUSTODIA order past
// its release_deadline that the buyer neither confirmed nor disputed.
//
// This is admin-triggered, not a real cron job — this app has no
// background job runner set up. Wiring it to an actual scheduled task
// (Vercel Cron or similar) is a follow-up, not something to assume
// without confirming the hosting setup first.
// ============================================================
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data: expiredOrders, error: findError } = await admin
    .from("orders")
    .select("id")
    .eq("status", "EN_CUSTODIA")
    .lt("release_deadline", now)

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 })
  }
  if (!expiredOrders || expiredOrders.length === 0) {
    return NextResponse.json({ released: 0 })
  }

  const ids = expiredOrders.map((o) => o.id)
  const { error: updateError } = await admin
    .from("orders")
    .update({ status: "LIBERADO", released_at: now })
    .in("id", ids)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ released: ids.length })
}
