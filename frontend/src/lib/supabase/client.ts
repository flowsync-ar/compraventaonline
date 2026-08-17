"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./types"

/**
 * Browser Supabase client — use in Client Components only.
 *
 * Creates a new client per call but @supabase/ssr handles deduplication
 * internally so this is safe to call at the top of a component.
 *
 * Do NOT use this in Server Components, Route Handlers, or middleware.
 * Use `createClient()` from `./server` instead.
 *
 * NOTE: Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * to be set in .env.local. See .env.local.example for the required keys.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. " +
      "Copy .env.local.example to .env.local and fill in your project credentials."
    )
  }

  return createBrowserClient<Database>(url, key)
}
