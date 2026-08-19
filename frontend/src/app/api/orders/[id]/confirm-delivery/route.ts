import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSeller } from "@/lib/supabase/seller-guard"

// ============================================================
// POST /api/orders/[id]/confirm-delivery
// The buyer's half of the escrow flow: "Confirmar que recibí el
// producto" — releases the held payment so the seller gets paid (by bank
// transfer, done manually/from the admin panel; this endpoint only marks
// it LIBERADO, it doesn't move money on its own).
// Only the order's own buyer can call this, and only while EN_CUSTODIA —
// see 022_escrow_payments.sql.
// ============================================================
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await context.params
  const supabase = await createServerClient()
  const buyer = await requireSeller(supabase)
  if (!buyer) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, buyer_id, status")
    .eq("id", orderId)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 })
  }
  if (order.buyer_id !== buyer.sellerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  if (order.status !== "EN_CUSTODIA") {
    return NextResponse.json(
      { error: "Esta orden no está en un estado que permita confirmar la entrega." },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()
  const { error: updateError } = await admin
    .from("orders")
    .update({ status: "LIBERADO", delivery_confirmed_at: now, released_at: now })
    .eq("id", orderId)

  if (updateError) {
    console.error("[confirm-delivery] update failed:", updateError.message)
    return NextResponse.json({ error: "No se pudo confirmar la entrega." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
