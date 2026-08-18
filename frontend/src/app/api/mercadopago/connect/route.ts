import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSeller } from "@/lib/supabase/seller-guard"
import {
  buildAuthorizationUrl,
  generatePkcePair,
  getMpOAuthConfig,
  newOAuthState,
} from "@/lib/mercadopago/oauth"

export const dynamic = "force-dynamic"

// Starts the OAuth flow: redirects the logged-in seller to Mercado Pago
// to authorize this app, so future checkouts on their listings pay
// directly into their own MP account.
export async function GET(request: NextRequest) {
  const redirectUri = `${request.nextUrl.origin}/api/mercadopago/callback`
  const config = getMpOAuthConfig(redirectUri)
  if (!config) {
    return NextResponse.json(
      { error: "Mercado Pago no está configurado en la plataforma." },
      { status: 503 },
    )
  }

  const supabase = await createServerClient()
  const seller = await requireSeller(supabase)
  if (!seller) {
    return NextResponse.redirect(
      `${request.nextUrl.origin}/login?redirect=${encodeURIComponent("/dashboard?tab=profile")}`,
    )
  }

  const pkce = generatePkcePair()
  const state = newOAuthState()

  const admin = createAdminClient()
  const { error: upsertError } = await admin.from("seller_mercadopago_accounts").upsert(
    {
      seller_id: seller.sellerId,
      oauth_pending_state: state,
      oauth_pending_code_verifier: pkce.codeVerifier,
      oauth_pending_created_at: new Date().toISOString(),
    },
    { onConflict: "seller_id" },
  )

  if (upsertError) {
    console.error("[mp-connect] failed to store pending OAuth state", upsertError)
    return NextResponse.json({ error: "No se pudo iniciar la vinculación" }, { status: 500 })
  }

  return NextResponse.redirect(
    buildAuthorizationUrl({ config, state, codeChallenge: pkce.codeChallenge }),
  )
}
