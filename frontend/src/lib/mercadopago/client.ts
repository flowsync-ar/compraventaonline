const MP_API = "https://api.mercadopago.com"

export interface MpPreferenceResult {
  id: string
  initPoint: string
  sandboxInitPoint?: string
}

export interface MpPaymentInfo {
  id: number
  status: string
  status_detail?: string
  external_reference?: string
  transaction_amount?: number
  currency_id?: string
}

function mpCurrency(currency?: string): string {
  const c = (currency ?? "ARS").toUpperCase()
  return c === "USD" ? "USD" : "ARS"
}

/** Mercado Pago only accepts auto_return with public https URLs (not localhost). */
function canUseAutoReturn(successUrl: string): boolean {
  try {
    const u = new URL(successUrl)
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return false
    return u.protocol === "https:"
  } catch {
    return false
  }
}

// Creates a Checkout Pro preference under the SELLER's own Mercado Pago
// account (accessToken is the seller's OAuth token) — the payment goes
// directly to the seller, this platform never touches the money.
export async function createCheckoutPreference(params: {
  accessToken: string
  title: string
  amount: number
  currency?: string
  externalReference: string
  payerEmail?: string
  notificationUrl: string
  backUrls: { success: string; failure: string; pending: string }
}): Promise<MpPreferenceResult> {
  const back_urls = {
    success: params.backUrls.success.trim(),
    failure: params.backUrls.failure.trim(),
    pending: params.backUrls.pending.trim(),
  }

  const preferenceBody: Record<string, unknown> = {
    items: [
      {
        title: params.title.slice(0, 256),
        quantity: 1,
        unit_price: params.amount,
        currency_id: mpCurrency(params.currency),
      },
    ],
    ...(params.payerEmail ? { payer: { email: params.payerEmail } } : {}),
    external_reference: params.externalReference,
    notification_url: params.notificationUrl,
    back_urls,
  }
  if (canUseAutoReturn(back_urls.success)) {
    preferenceBody.auto_return = "approved"
  }

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preferenceBody),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error("[mercadopago/client] createCheckoutPreference failed", data)
    throw new Error("Error al crear preferencia de Mercado Pago")
  }

  return {
    id: data.id,
    initPoint: data.init_point,
    sandboxInitPoint: data.sandbox_init_point,
  }
}

export async function getPayment(accessToken: string, paymentId: string): Promise<MpPaymentInfo> {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  if (!res.ok) {
    console.error("[mercadopago/client] getPayment failed", data)
    throw new Error("Error al consultar pago en Mercado Pago")
  }
  return data as MpPaymentInfo
}

export interface MpUser {
  id: number
  nickname?: string
  live_mode?: boolean
  email?: string
}

export async function getMercadoPagoUser(accessToken: string): Promise<MpUser> {
  const res = await fetch(`${MP_API}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = (await res.json()) as MpUser & { message?: string; error?: string }
  if (!res.ok) {
    console.error("[mercadopago/client] getMercadoPagoUser failed", data)
    throw new Error("Token rechazado por Mercado Pago")
  }
  return data
}

/** Prefer the sandbox checkout URL when the token is a test (TEST-) token. */
export function checkoutUrl(pref: MpPreferenceResult, accessToken: string): string {
  if (accessToken.startsWith("TEST-") && pref.sandboxInitPoint) {
    return pref.sandboxInitPoint
  }
  return pref.initPoint
}
