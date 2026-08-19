import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSeller } from "@/lib/supabase/seller-guard"

export async function POST() {
  const supabase = await createServerClient()
  const seller = await requireSeller(supabase)
  if (!seller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  await admin
    .from("seller_mercadopago_accounts")
    .update({
      access_token: null,
      refresh_token: null,
      mp_user_id: null,
      public_key: null,
      token_expires_at: null,
      connected_at: null,
      oauth_pending_state: null,
      oauth_pending_code_verifier: null,
      oauth_pending_created_at: null,
    })
    .eq("seller_id", seller.sellerId)

  await admin.from("sellers").update({ mercadopago_connected: false }).eq("id", seller.sellerId)

  return NextResponse.json({ ok: true })
}
