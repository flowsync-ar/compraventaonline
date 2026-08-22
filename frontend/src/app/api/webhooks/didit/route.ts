import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyWebhookSignature } from "@/lib/didit/client"
import type { Json } from "@/lib/supabase/types"

export const dynamic = "force-dynamic"

interface DiditWebhookPayload {
  webhook_type: string
  session_id: string
  status: string
  vendor_data?: string
  decision?: {
    face_matches?: { status: string; score?: number }[]
  }
}

// Didit calls this on every status change for a verification session
// (webhook_type "status.updated"). We only act on the terminal states —
// intermediate ones (e.g. "In Progress") just get logged.
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-signature-v2")

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("[webhooks/didit] invalid signature")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: DiditWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  if (payload.webhook_type !== "status.updated") {
    return NextResponse.json({ ok: true, skipped: "not_status_update" })
  }

  const admin = createAdminClient()
  const faceMatch = payload.decision?.face_matches?.[0]

  const { data: verification, error: updateError } = await admin
    .from("identity_verifications")
    .update({
      status: payload.status,
      face_match_score: faceMatch?.score ?? null,
      raw_payload: payload as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", payload.session_id)
    .select("seller_id")
    .single()

  if (updateError || !verification) {
    console.error("[webhooks/didit] session not found", payload.session_id, updateError)
    return NextResponse.json({ ok: true, skipped: "session_not_found" })
  }

  if (payload.status === "Approved") {
    await admin
      .from("sellers")
      .update({ identity_verified: true })
      .eq("id", verification.seller_id)
  }

  return NextResponse.json({ ok: true })
}
