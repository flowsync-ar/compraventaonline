import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSeller } from "@/lib/supabase/seller-guard"
import { exchangeAuthorizationCode, getMpOAuthConfig, tokenExpiresAtIso } from "@/lib/mercadopago/oauth"

export const dynamic = "force-dynamic"

function dashboardRedirect(origin: string, params: Record<string, string>) {
  const q = new URLSearchParams({ tab: "profile", ...params })
  return NextResponse.redirect(`${origin}/dashboard?${q.toString()}`)
}

// OAuth callback — exchanges `code` for tokens and stores them for the seller.
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const oauthError = searchParams.get("error")

  if (oauthError) {
    return dashboardRedirect(origin, { mp: "error", mp_msg: oauthError })
  }
  if (!code || !state) {
    return dashboardRedirect(origin, { mp: "error", mp_msg: "missing_code" })
  }

  const redirectUri = `${origin}/api/mercadopago/callback`
  const config = getMpOAuthConfig(redirectUri)
  if (!config) {
    return dashboardRedirect(origin, { mp: "error", mp_msg: "oauth_not_configured" })
  }

  const supabase = await createServerClient()
  const seller = await requireSeller(supabase)
  if (!seller) {
    return dashboardRedirect(origin, { mp: "error", mp_msg: "session_mismatch" })
  }

  const admin = createAdminClient()
  const { data: account } = await admin
    .from("seller_mercadopago_accounts")
    .select("seller_id, oauth_pending_state, oauth_pending_code_verifier, oauth_pending_created_at")
    .eq("seller_id", seller.sellerId)
    .maybeSingle()

  if (!account || account.oauth_pending_state !== state) {
    return dashboardRedirect(origin, { mp: "error", mp_msg: "invalid_state" })
  }

  const pendingCreatedAt = account.oauth_pending_created_at
    ? new Date(account.oauth_pending_created_at).getTime()
    : 0
  if (Date.now() - pendingCreatedAt > 15 * 60_000) {
    return dashboardRedirect(origin, { mp: "error", mp_msg: "expired_state" })
  }

  try {
    const tokens = await exchangeAuthorizationCode({
      config,
      code,
      codeVerifier: account.oauth_pending_code_verifier ?? undefined,
    })

    const { error: updateError } = await admin
      .from("seller_mercadopago_accounts")
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        mp_user_id: tokens.user_id != null ? String(tokens.user_id) : null,
        public_key: tokens.public_key ?? null,
        token_expires_at: tokenExpiresAtIso(tokens.expires_in) ?? null,
        connected_at: new Date().toISOString(),
        oauth_pending_state: null,
        oauth_pending_code_verifier: null,
        oauth_pending_created_at: null,
      })
      .eq("seller_id", seller.sellerId)

    if (updateError) {
      console.error("[mp-callback] failed to store tokens", updateError)
      return dashboardRedirect(origin, { mp: "error", mp_msg: "credentials_not_saved" })
    }

    await admin.from("sellers").update({ mercadopago_connected: true }).eq("id", seller.sellerId)

    return dashboardRedirect(origin, { mp: "connected" })
  } catch (err) {
    console.error("[mp-callback] token exchange failed", err)
    await admin
      .from("seller_mercadopago_accounts")
      .update({ oauth_pending_state: null, oauth_pending_code_verifier: null, oauth_pending_created_at: null })
      .eq("seller_id", seller.sellerId)

    return dashboardRedirect(origin, {
      mp: "error",
      mp_msg: err instanceof Error ? err.message.slice(0, 80) : "token_exchange",
    })
  }
}
