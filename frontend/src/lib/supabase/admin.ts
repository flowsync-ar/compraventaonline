import { createClient } from "@supabase/supabase-js"
import type { Database } from "./types"

// Admin client — uses the service role key, bypasses RLS.
// Server-only. Never import this from a Client Component.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase admin env vars")
  }
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  })
}
