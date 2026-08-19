import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { refundPayment } from "@/lib/mercadopago/client"
import { getPlatformMercadoPagoAccessToken } from "@/lib/mercadopago/tokens"

// ============================================================
// POST /api/admin/disputes/[id]/resolve
// Body: { decision: "RELEASE" | "REFUND", notes?: string }
//
// The human decision point the whole escrow model depends on — see chat
// history: Mercado Pago itself has no algorithmic way to arbitrate "el
// vendedor dice que entregó, el comprador dice que no" and neither does
// any code here. An admin reviews whatever evidence came in through
// dispute_reason (and, today, direct contact with both sides) and picks
// one of these two, final.
// ============================================================
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id: orderId } = await context.params

  let decision: "RELEASE" | "REFUND"
  let notes = ""
  try {
    const body = await request.json()
    if (body?.decision !== "RELEASE" && body?.decision !== "REFUND") {
      return NextResponse.json({ error: "Decisión inválida" }, { status: 400 })
    }
    decision = body.decision
    notes = typeof body?.notes === "string" ? body.notes.trim() : ""
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, status, mp_payment_id, payment_method")
    .eq("id", orderId)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 })
  }
  if (order.status !== "DISPUTADO") {
    return NextResponse.json({ error: "Esta orden no está en disputa." }, { status: 400 })
  }

  const now = new Date().toISOString()

  if (decision === "RELEASE") {
    const { error } = await admin
      .from("orders")
      .update({ status: "LIBERADO", released_at: now, admin_notes: notes || null })
      .eq("id", orderId)
    if (error) {
      return NextResponse.json({ error: "No se pudo liberar el pago." }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // REFUND: actually call Mercado Pago before touching our own status —
  // if the refund call fails, the order must stay DISPUTADO, not silently
  // flip to REEMBOLSADO with no money having actually moved.
  if (order.mp_payment_id) {
    const accessToken = getPlatformMercadoPagoAccessToken()
    if (!accessToken) {
      return NextResponse.json({ error: "Mercado Pago no está configurado en la plataforma." }, { status: 503 })
    }
    try {
      await refundPayment(accessToken, order.mp_payment_id)
    } catch (err) {
      console.error("[disputes/resolve] refund failed:", err)
      return NextResponse.json({ error: "No se pudo reembolsar el pago en Mercado Pago." }, { status: 502 })
    }
  } else {
    console.warn("[disputes/resolve] order has no mp_payment_id, marking refunded without an MP call:", orderId)
  }

  const { error: updateError } = await admin
    .from("orders")
    .update({ status: "REEMBOLSADO", refunded_at: now, admin_notes: notes || null })
    .eq("id", orderId)

  if (updateError) {
    return NextResponse.json({ error: "El reembolso se hizo pero no se pudo actualizar la orden." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
