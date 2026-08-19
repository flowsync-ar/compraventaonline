import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyMercadoPagoWebhookSignature } from "@/lib/mercadopago/webhook-verify"
import { getPayment } from "@/lib/mercadopago/client"
import { getPlatformMercadoPagoAccessToken } from "@/lib/mercadopago/tokens"
import { computeReleaseDeadline } from "@/lib/escrow"

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

async function processPaymentId(paymentId: string) {
  // Every payment now settles into the platform's own MP account (escrow
  // model — see 022_escrow_payments.sql), so there's no more "which
  // connected seller does this belong to" lookup: one token reads it.
  const accessToken = getPlatformMercadoPagoAccessToken()
  if (!accessToken) return { ok: true, skipped: "platform_mp_not_configured" }

  let payment
  try {
    payment = await getPayment(accessToken, paymentId)
  } catch {
    return { ok: true, skipped: "payment_not_found" }
  }

  if (payment.status !== "approved") {
    return { ok: true, skipped: `status:${payment.status}` }
  }

  const orderId = payment.external_reference
  if (!orderId) return { ok: true, skipped: "no_external_reference" }

  const admin = createAdminClient()
  const { data: order } = await admin
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle()

  if (!order) return { ok: true, skipped: "order_not_found" }
  if (order.status !== "PENDING") return { ok: true, skipped: `already:${order.status}` }

  // Funds are captured (approved) but held — EN_CUSTODIA, not PAID/done.
  // The seller only actually gets paid (by bank transfer) once the buyer
  // confirms delivery or the release window lapses; see
  // /api/orders/[id]/confirm-delivery and the admin disputes panel.
  const now = new Date()
  await admin
    .from("orders")
    .update({
      status: "EN_CUSTODIA",
      mp_payment_id: String(payment.id),
      paid_at: now.toISOString(),
      release_deadline: computeReleaseDeadline(now),
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

  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()
  if (webhookSecret) {
    const valid = verifyMercadoPagoWebhookSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret: webhookSecret,
    })
    if (!valid) {
      console.warn("[mp-webhook] invalid signature for", dataId)
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 })
    }
  }

  try {
    const result = await processPaymentId(dataId)
    return NextResponse.json(result)
  } catch (err) {
    console.error("[mp-webhook] processing failed", err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
