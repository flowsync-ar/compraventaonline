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
    return NextResponse.json({ error: "No se pudo iniciar la verificación de identidad" }, { status: 502 })
  }

  const admin = createAdminClient()
  const { error: insertError } = await admin.from("identity_verifications").insert({
    seller_id: seller.sellerId,
    session_id: session.session_id,
    status: "PENDING",
  })
  if (insertError) {
    console.error("[kyc/session] failed to store session", insertError)
    return NextResponse.json({ error: "No se pudo iniciar la verificación de identidad" }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
