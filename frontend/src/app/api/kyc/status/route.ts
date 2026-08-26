import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSeller } from "@/lib/supabase/seller-guard"
import { getSessionDecision } from "@/lib/didit/client"

// Reconciles our stored KYC status against Didit's own record for the
// seller's most recent verification attempt. The "status.updated" webhook
// is the fast path, but if it never arrives (misconfigured endpoint,
// dropped delivery, Didit's decision taking longer than our poll window)
// the seller stays stuck seeing "not verified" forever even after Didit
// approved them — this pulls the real status directly instead of waiting.
export async function POST() {
  const supabase = await createServerClient()
  const seller = await requireSeller(supabase)
  if (!seller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: latest } = await admin
    .from("identity_verifications")
    .select("id, session_id, status")
    .eq("seller_id", seller.sellerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latest) {
    return NextResponse.json({ verified: false, status: null })
  }

  let decision
  try {
    decision = await getSessionDecision(latest.session_id)
  } catch (err) {
    console.error("[kyc/status] failed to fetch Didit decision", err)
    return NextResponse.json({ verified: false, status: latest.status })
  }

  if (decision.status !== latest.status) {
    const faceMatch = decision.face_matches?.[0]
    await admin
      .from("identity_verifications")
      .update({
        status: decision.status,
        face_match_score: faceMatch?.score ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", latest.id)

    if (decision.status === "Approved") {
      await admin.from("sellers").update({ identity_verified: true }).eq("id", seller.sellerId)
    }
  }

  return NextResponse.json({ verified: decision.status === "Approved", status: decision.status })
}
