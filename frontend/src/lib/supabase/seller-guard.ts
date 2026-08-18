import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./types"

export interface AuthedSeller {
  userId: string
  userEmail: string | null
  sellerId: string
}

/**
 * Resolves the logged-in seller for a Route Handler: validates the Supabase
 * session cookie, then looks up the caller's own `sellers` row. Returns null
 * if there's no session or no matching seller — callers should respond with
 * 401/403 in that case.
 */
export async function requireSeller(
  supabase: SupabaseClient<Database>,
): Promise<AuthedSeller | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return null

  const { data: sellerRow, error: sellerError } = await supabase
    .from("sellers")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (sellerError || !sellerRow) return null

  return { userId: user.id, userEmail: user.email ?? null, sellerId: sellerRow.id }
}
