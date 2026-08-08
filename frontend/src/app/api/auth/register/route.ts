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
      redirectTo: `${origin}/login`,
    },
  })

  if (linkError || !linkData?.user) {
    const message = linkError?.message?.includes("already")
      ? "Ese email ya está registrado."
      : linkError?.message ?? "No se pudo crear la cuenta. Intentá de nuevo."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const userId = linkData.user.id
  const confirmUrl = linkData.properties?.action_link

  if (!confirmUrl) {
    return NextResponse.json(
      { error: "No se pudo generar el enlace de confirmación." },
      { status: 500 },
    )
  }

  // The trigger handle_new_user already created the sellers row —
  // fill in phone (required) and document_number (non-fatal if it fails,
  // can be completed later from the profile).
  const { error: sellerError } = await admin
    .from("sellers")
    .update({ phone, ...(documentNumber ? { document_number: documentNumber } : {}) })
    .eq("user_id", userId)

  if (sellerError) {
    console.warn("Could not update seller phone/document_number:", sellerError.message)
  }

  const mail = await sendConfirmationEmail({ to: email, fullName, confirmUrl })

  return NextResponse.json({
    ok: true,
    emailSent: mail.sent,
    emailWarning: mail.sent ? undefined : mail.reason,
  })
}
