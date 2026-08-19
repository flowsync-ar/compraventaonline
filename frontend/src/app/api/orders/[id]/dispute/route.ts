import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSeller } from "@/lib/supabase/seller-guard"

// ============================================================
// POST /api/orders/[id]/dispute
// The buyer's "Tengo un problema con esta compra" — freezes the held
// payment (blocks confirm-delivery from firing later; the money was
// already going nowhere until then anyway) and routes the order into the
// admin's dispute queue for a human decision (liberar al vendedor o
// reembolsar al comprador) — see /admin panel and
// POST /api/admin/disputes/[id]/resolve.
// ============================================================
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await context.params
  const supabase = await createServerClient()
  const buyer = await requireSeller(supabase)
  if (!buyer) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let reason = ""
  try {
    const body = await request.json()
    reason = typeof body?.reason === "string" ? body.reason.trim() : ""
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  if (!reason) {
    return NextResponse.json({ error: "Contanos qué pasó para poder revisarlo." }, { status: 400 })
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
      { error: "Esta orden no está en un estado que permita reportar un problema." },
      { status: 400 },
    )
  }

  const { error: updateError } = await admin
    .from("orders")
    .update({
      status: "DISPUTADO",
      dispute_opened_at: new Date().toISOString(),
      dispute_reason: reason,
    })
    .eq("id", orderId)

  if (updateError) {
    console.error("[dispute] update failed:", updateError.message)
    return NextResponse.json({ error: "No se pudo registrar el reclamo." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
