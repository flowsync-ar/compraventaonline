import "server-only"
import { createHmac, timingSafeEqual } from "crypto"

// Didit KYC (docs.didit.me) — DNI photo + selfie + liveness, biometric
// face-match against RENAPER. DIDIT_WORKFLOW_ID is created once in the
// Didit dashboard (Workflows → Create New) and never changes; it's not a
// per-session value.
const DIDIT_API_BASE = "https://verification.didit.me"

interface CreateSessionResult {
  session_id: string
  url: string
  session_token?: string
}

export async function createVerificationSession(params: {
  vendorData: string
  callbackUrl: string
}): Promise<CreateSessionResult> {
  const apiKey = process.env.DIDIT_API_KEY?.trim()
  const workflowId = process.env.DIDIT_WORKFLOW_ID?.trim()
  if (!apiKey || !workflowId) {
    throw new Error("Didit no está configurado en el servidor (falta DIDIT_API_KEY o DIDIT_WORKFLOW_ID)")
  }

  const res = await fetch(`${DIDIT_API_BASE}/v3/session/`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: workflowId,
      vendor_data: params.vendorData,
      callback: params.callbackUrl,
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    console.error("[didit] createVerificationSession failed", res.status, data)
    const diditMessage = data?.detail || data?.message || data?.error || JSON.stringify(data)
    throw new Error(`Didit rechazó la solicitud (HTTP ${res.status}): ${diditMessage}`)
  }

  return res.json()
}

// Didit signs the RAW webhook body (before any JSON.parse/re-stringify)
// with HMAC-SHA256 using the webhook secret, sent in the X-Signature-V2
// header. Verifying against the parsed-then-reserialized body would fail
// on key-order/whitespace differences — the raw text must be used as-is.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.DIDIT_WEBHOOK_SECRET?.trim()
  if (!secret || !signatureHeader) return false

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  const expectedBuf = Buffer.from(expected, "hex")
  const receivedBuf = Buffer.from(signatureHeader, "hex")
  if (expectedBuf.length !== receivedBuf.length) return false

  return timingSafeEqual(expectedBuf, receivedBuf)
}
