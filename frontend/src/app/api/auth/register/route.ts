import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendConfirmationEmail } from "@/lib/mail"

// ============================================================
// Admin client — uses service role key, bypasses RLS.
// Never exposed to the browser.
// ============================================================
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase admin env vars")
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

interface RegisterPayload {
  email: string
  password: string
  fullName: string
  sellerType: "PERSONAL_SELLER" | "BUSINESS_SELLER"
  documentNumber?: string
  phone: string
  location?: string
}

export async function POST(request: NextRequest) {
  let body: RegisterPayload
  try {
    body = (await request.json()) as RegisterPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password
  const fullName = body.fullName?.trim()
  const sellerType = body.sellerType
  const documentNumber = body.documentNumber?.trim()
  const phone = body.phone?.trim()
  const location = body.location?.trim()

  if (!email || !password || !fullName || !sellerType || !phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const admin = createAdminClient()
  const origin = request.nextUrl.origin

  // Creates the auth user (unconfirmed) and returns a confirmation link —
  // Supabase does NOT send any email here, we send it ourselves via Zoho.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: { full_name: fullName, seller_type: sellerType },
    },
  })

  if (linkError || !linkData?.user) {
    const message = linkError?.message?.includes("already")
      ? "Ese email ya está registrado."
      : linkError?.message ?? "No se pudo crear la cuenta. Intentá de nuevo."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const userId = linkData.user.id
  const hashedToken = linkData.properties?.hashed_token

  if (!hashedToken) {
    return NextResponse.json(
      { error: "No se pudo generar el enlace de confirmación." },
      { status: 500 },
    )
  }

  // Points at our own route (not Supabase's hosted /auth/v1/verify) so
  // verifyOtp() runs server-side and @supabase/ssr can persist a real
  // PKCE cookie session — see frontend/src/app/auth/confirm/route.ts.
  const confirmUrl = `${origin}/auth/confirm?token_hash=${hashedToken}&type=signup&next=/dashboard`

  // The trigger handle_new_user already created the sellers row —
  // fill in phone (required) and document_number (non-fatal if it fails,
  // can be completed later from the profile).
  const { error: sellerError } = await admin
    .from("sellers")
    .update({
      phone,
      ...(documentNumber ? { document_number: documentNumber } : {}),
      ...(location ? { location } : {}),
    })
    .eq("user_id", userId)

  if (sellerError) {
    console.warn("Could not update seller phone/document_number:", sellerError.message)
  }

  const mail = await sendConfirmationEmail({
    to: email,
    fullName,
    confirmUrl,
    logoUrl: `${origin}/logo-transparente.png`,
  })

  return NextResponse.json({
    ok: true,
    emailSent: mail.sent,
    emailWarning: mail.sent ? undefined : mail.reason,
  })
}
