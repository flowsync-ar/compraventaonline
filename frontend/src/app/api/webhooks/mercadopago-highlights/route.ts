import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyMercadoPagoWebhookSignature } from "@/lib/mercadopago/webhook-verify"
import { getPayment } from "@/lib/mercadopago/client"

export const dynamic = "force-dynamic"

function extractPaymentId(request: NextRequest, body?: unknown): string | null {
  const { searchParams } = new URL(request.url)
  let paymentId = searchParams.get("data.id") || searchParams.get("id") || searchParams.get("data_id")

  if (!paymentId && body && typeof body === "object") {
    const b = body as Record<string, unknown>
    const data = b.data as Record<string, unknown> | undefined
    paymentId = (data?.id as string | number | undefined)?.toString() || (b.id as string | number | undefined)?.toString() || null
  }

  return paymentId?.trim() || null
}

// Unlike /api/webhooks/mercadopago (which owns payments made to connected
// SELLER accounts and has to guess which seller by trying each stored
// token), this payment always belongs to the platform's own account — the
// access token is known up front, no lookup needed.
async function processPaymentId(paymentId: string) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
  if (!accessToken) return { ok: true, skipped: "not_configured" }

  const payment = await getPayment(accessToken, paymentId)
  if (payment.status !== "approved") {
    return { ok: true, skipped: `status:${payment.status}` }
  }

  const orderId = payment.external_reference
  if (!orderId) return { ok: true, skipped: "no_external_reference" }

  const admin = createAdminClient()
  const { data: order } = await admin
    .from("highlight_orders")
    .select("id, listing_id, seller_id, duration_days, status")
    .eq("id", orderId)
    .maybeSingle()

  if (!order) return { ok: true, skipped: "order_not_found" }
  if (order.status === "PAID") return { ok: true, skipped: "already_paid" }

  const endDate = new Date()
  endDate.setDate(endDate.getDate() + order.duration_days)

  await admin.from("highlighted_products").insert({
    listing_id: order.listing_id,
    seller_id: order.seller_id,
    plan: "FEATURED",
    end_date: endDate.toISOString(),
  })

  await admin
    .from("listings")
    .update({ featured_plan: "FEATURED" })
    .eq("id", order.listing_id)

  await admin
    .from("highlight_orders")
    .update({
      status: "PAID",
      mp_payment_id: String(payment.id),
      paid_at: new Date().toISOString(),
    })
    .eq("id", order.id)

  return { ok: true, orderId: order.id }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = undefined
  }

  const dataId = extractPaymentId(request, body)
  if (!dataId) {
    return NextResponse.json({ ok: true, skipped: "no data id" })
  }

  const webhookSecret = process.env.MERCADOPAGO_HIGHLIGHTS_WEBHOOK_SECRET?.trim()
  if (webhookSecret) {
    const valid = verifyMercadoPagoWebhookSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret: webhookSecret,
    })
    if (!valid) {
      console.warn("[mp-highlights-webhook] invalid signature for", dataId)
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 })
    }
  }

  try {
    const result = await processPaymentId(dataId)
    return NextResponse.json(result)
  } catch (err) {
    console.error("[mp-highlights-webhook] processing failed", err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
