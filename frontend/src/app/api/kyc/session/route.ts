import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSeller } from "@/lib/supabase/seller-guard"
import { createVerificationSession } from "@/lib/didit/client"

// Starts an identity verification attempt for the logged-in seller and
// returns Didit's hosted session URL to redirect them to.
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const seller = await requireSeller(supabase)
  if (!seller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let returnTo = "/dashboard?tab=profile"
  try {
    const body = await request.json()
    if (typeof body?.returnTo === "string" && body.returnTo.startsWith("/")) {
      returnTo = body.returnTo
    }
  } catch {
    // No body (or invalid JSON) — fall back to the dashboard default above.
  }

  const separator = returnTo.includes("?") ? "&" : "?"
  const callbackUrl = `${request.nextUrl.origin}${returnTo}${separator}kyc=return`

  let session
  try {
    session = await createVerificationSession({
      vendorData: seller.sellerId,
      callbackUrl,
    })
  } catch (err) {
    console.error("[kyc/session] failed to create Didit session", err)
    const message = err instanceof Error ? err.message : "No se pudo iniciar la verificación de identidad"
    return NextResponse.json({ error: message }, { status: 502 })
  }

  // Didit reuses an existing PENDING session for the same vendor_data
  // instead of creating a new one when the seller retries before
  // finishing (e.g. closed the tab, session expired) — so this can be
  // called more than once for the same session_id. upsert + ignoreDuplicates
  // instead of a plain insert: the row from the first attempt is already
  // correct (status PENDING), nothing needs to change on a repeat.
  const admin = createAdminClient()
  const { error: insertError } = await admin.from("identity_verifications").upsert(
    {
      seller_id: seller.sellerId,
      session_id: session.session_id,
      status: "PENDING",
    },
    { onConflict: "session_id", ignoreDuplicates: true }
  )
  if (insertError) {
    console.error("[kyc/session] failed to store session", insertError)
    return NextResponse.json({ error: "No se pudo iniciar la verificación de identidad" }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
