import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "./types"

/**
 * Server Supabase client — use in Server Components and Route Handlers.
 *
 * Must be called inside an async context (RSC, Route Handler, Server Action).
 * Creates a new client per request — never share across requests.
 *
 * Next.js 16: cookies() returns a Promise — must be awaited.
 *
 * In RSC/Route Handlers cookies cannot always be set (read-only context).
 * Session refresh is handled by middleware.ts instead.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // In RSC context (read-only cookies), setAll throws.
            // This is expected — middleware handles session writes.
          }
        },
      },
    }
  )
}
