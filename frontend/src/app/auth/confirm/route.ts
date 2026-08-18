import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { EmailOtpType } from "@supabase/supabase-js"

// Official Supabase + Next.js SSR pattern: our own confirm route, hit by
// the links we build in register/forgot-password, verifies the token
// server-side via verifyOtp() so @supabase/ssr can persist a real cookie
// session. We deliberately do NOT use the raw `action_link` Supabase's
// generateLink() returns — that redirects to Supabase's own /auth/v1/verify,
// which lands back on our app with tokens in the URL hash (implicit flow).
// @supabase/ssr's browser client is PKCE-only and never reads that hash,
// so the account gets confirmed on Supabase's side but the app never
// sees a session — exactly the bug this route fixes.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/dashboard"

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirm_failed`)
}
