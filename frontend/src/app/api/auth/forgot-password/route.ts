import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendPasswordResetEmail } from "@/lib/mail"

// Always returns a generic success message, whether or not the email is
// registered — avoids leaking which emails have an account.
const GENERIC_RESPONSE = {
  ok: true,
  message: "Si el email está registrado, te enviamos instrucciones para restablecer la contraseña.",
}

export async function POST(request: NextRequest) {
  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: "Falta el email" }, { status: 400 })
  }

  const admin = createAdminClient()
  const origin = request.nextUrl.origin

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  })

  // Don't reveal whether the email exists — log server-side, respond generic.
  if (error || !data?.properties?.hashed_token) {
    console.warn("[forgot-password] generateLink failed:", error?.message)
    return NextResponse.json(GENERIC_RESPONSE)
  }

  // Our own /auth/confirm route (not Supabase's hosted /auth/v1/verify) so
  // verifyOtp() runs server-side and @supabase/ssr can persist a real PKCE
  // cookie session before landing on /reset-password.
  const resetUrl = `${origin}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=/reset-password`

  const mail = await sendPasswordResetEmail({
    to: email,
    resetUrl,
    logoIconUrl: `${origin}/logo-trans-dark.png`,
    logoWordmarkUrl: `${origin}/solotexto-dark.png`,
  })
  if (!mail.sent) {
    console.warn("[forgot-password] Could not send email:", mail.reason)
  }

  return NextResponse.json(GENERIC_RESPONSE)
}
