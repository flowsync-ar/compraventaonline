import { createServerClient } from "@supabase/ssr"
import type { NextRequest, NextResponse } from "next/server"
import type { Database } from "./types"

/**
 * updateSession — call this in src/middleware.ts on every request.
 *
 * Refreshes the Supabase session cookie so that access tokens don't
 * expire mid-session. Also provides the current session for route
 * protection logic.
 *
 * Both getAll and setAll must be implemented here so that token
 * refresh writes propagate to the response cookies correctly.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse
) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          // Write cookies to both the outgoing request (for supabase-js)
          // and the response (for the browser).
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
          // Apply cache-control headers if provided by @supabase/ssr
          if (headers) {
            Object.entries(headers).forEach(([key, value]) => {
              response.headers.set(key, value)
            })
          }
        },
      },
    }
  )

  // IMPORTANT: getUser() (not getSession()) makes a network call to
  // validate the token server-side. This is the recommended pattern
  // for middleware to prevent using stale/forged session data.
  const { data: { user } } = await supabase.auth.getUser()

  return { supabase, user, response }
}
