import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyMercadoPagoWebhookSignature } from "@/lib/mercadopago/webhook-verify"
import { getPayment, type MpPaymentInfo } from "@/lib/mercadopago/client"
import { getSellerMercadoPagoAccessToken } from "@/lib/mercadopago/tokens"

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

// Finds which connected seller a payment belongs to by trying each seller's
// stored access token against the payment resource — Mercado Pago's API
// only lets an account read its own payments, so the first token that
// succeeds is the owner. Fine at this marketplace's scale (few connected
// sellers); mirrors the same pattern used in nodo-clinica.
async function findPaymentOwner(paymentId: string): Promise<{ sellerId: string; payment: MpPaymentInfo } | null> {
  const admin = createAdminClient()
  const { data: accounts } = await admin
    .from("seller_mercadopago_accounts")
    .select("seller_id")
    .not("access_token", "is", null)

  for (const account of accounts ?? []) {
    // Goes through the refresh-aware helper (not the raw stored column) —
    // an expired token here would otherwise silently 401, get treated as
    // "not the owner", and leave a genuinely-approved payment stuck PENDING.
    const accessToken = await getSellerMercadoPagoAccessToken(account.seller_id)
    if (!accessToken) continue
    try {
      const payment = await getPayment(accessToken, paymentId)
      return { sellerId: account.seller_id, payment }
    } catch {
      continue
    }
  }
  return null
}

async function processPaymentId(paymentId: string) {
  const match = await findPaymentOwner(paymentId)
  if (!match) return { ok: true, skipped: "payment_not_matched" }

  const { sellerId, payment } = match
  if (payment.status !== "approved") {
    return { ok: true, skipped: `status:${payment.status}` }
  }

  const orderId = payment.external_reference
  if (!orderId) return { ok: true, skipped: "no_external_reference" }

  const admin = createAdminClient()
  const { data: order } = await admin
    .from("orders")
    .select("id, seller_id, status")
    .eq("id", orderId)
    .eq("seller_id", sellerId)
    .maybeSingle()

  if (!order) return { ok: true, skipped: "order_not_found" }
  if (order.status === "PAID") return { ok: true, skipped: "already_paid" }

  await admin
    .from("orders")
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
