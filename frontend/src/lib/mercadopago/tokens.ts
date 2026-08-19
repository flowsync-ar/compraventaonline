import { createAdminClient } from "@/lib/supabase/admin"
import { getMpOAuthConfig, isTokenExpired, refreshOAuthToken, tokenExpiresAtIso } from "./oauth"

// The platform's OWN Mercado Pago account — checkout now settles here
// (escrow model, see 022_escrow_payments.sql) instead of each seller's
// OAuth-connected account. This is a static access token from
// CompraventaOnline's own MP business account (Developers panel →
// "Credenciales de producción"), not an OAuth flow — same one-time manual
// setup as MERCADOPAGO_CLIENT_ID/SECRET already required for the
// (now-legacy) seller-connect flow.
export function getPlatformMercadoPagoAccessToken(): string | null {
  return process.env.MERCADOPAGO_PLATFORM_ACCESS_TOKEN?.trim() || null
}

/**
 * Returns a seller's valid Mercado Pago access token, refreshing it first
 * if it's expired (or close to it). Returns null if the seller never
 * connected an account, or the refresh fails.
 */
export async function getSellerMercadoPagoAccessToken(sellerId: string): Promise<string | null> {
  const admin = createAdminClient()

  const { data: account } = await admin
    .from("seller_mercadopago_accounts")
    .select("access_token, refresh_token, token_expires_at")
    .eq("seller_id", sellerId)
    .maybeSingle()

  if (!account?.access_token) return null
  if (!isTokenExpired(account.token_expires_at)) return account.access_token
  if (!account.refresh_token) return account.access_token // best effort, might still be valid

  // Redirect URI doesn't matter for a refresh_token grant, but the OAuth
  // config still needs client_id/client_secret to be present.
  const config = getMpOAuthConfig("unused")
  if (!config) return account.access_token

  try {
    const tokens = await refreshOAuthToken({ config, refreshToken: account.refresh_token })
    await admin
      .from("seller_mercadopago_accounts")
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? account.refresh_token,
        token_expires_at: tokenExpiresAtIso(tokens.expires_in) ?? null,
      })
      .eq("seller_id", sellerId)
    return tokens.access_token
  } catch (err) {
    console.error("[mp-tokens] refresh failed for seller", sellerId, err)
    return account.access_token
  }
}
