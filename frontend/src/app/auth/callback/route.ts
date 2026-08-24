import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// OAuth (Google) lands here with a PKCE `code` after Supabase's own
// /auth/v1/callback redirects back to us — exchangeCodeForSession() is what
// lets @supabase/ssr persist a real cookie session server-side, mirroring
// the token_hash pattern in /auth/confirm/route.ts for email links.
//
// handle_new_user() (001_initial.sql) already creates a bare-bones
// `sellers` row (name + type only) on first sign-in regardless of
// provider, but Google never supplies username/phone/terms acceptance —
// so a first-time Google sign-in gets sent to /completar-perfil instead of
// straight to `next`. Returning users (username already set) skip it.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: seller } = await supabase
          .from("sellers")
          .select("username")
          .eq("user_id", user.id)
          .maybeSingle()

        if (!seller?.username) {
          const completeUrl = new URL("/completar-perfil", origin)
          completeUrl.searchParams.set("next", next)
          return NextResponse.redirect(completeUrl)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}
