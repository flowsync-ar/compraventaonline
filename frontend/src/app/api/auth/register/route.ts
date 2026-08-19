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
  username: string
  acceptTerms: boolean
  // data: URL ("data:image/png;base64,...") from FileReader.readAsDataURL —
  // optional, the user may skip the avatar entirely.
  avatarDataUrl?: string | null
}

const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/

// Matches the bucket/upload logic below — only images we can confidently
// give a safe, correct extension to.
const AVATAR_MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
}

export async function POST(request: NextRequest) {
  let body: RegisterPayload
  try {
    body = (await request.json()) as RegisterPayload
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password
  const fullName = body.fullName?.trim()
  const sellerType = body.sellerType
  const documentNumber = body.documentNumber?.trim()
  const phone = body.phone?.trim()
  const location = body.location?.trim()
  // Always lowercase — matches the client (see login/page.tsx), keeps
  // uniqueness checks a plain `eq` instead of needing a case-insensitive
  // lookup (ILIKE would misread a literal underscore in the username as
  // its single-char wildcard).
  const username = body.username?.trim().toLowerCase()
  const acceptTerms = body.acceptTerms === true
  const avatarDataUrl = body.avatarDataUrl?.trim() || null

  if (!email || !password || !fullName || !sellerType || !phone || !username) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
  }

  // Defense in depth — the client already blocks submission without this,
  // but terms_acceptances is meant to be a real audit record, not
  // something we assume happened just because the request arrived.
  if (!acceptTerms) {
    return NextResponse.json(
      { error: "Debes aceptar los términos y condiciones para registrarte." },
      { status: 400 }
    )
  }

  if (!USERNAME_PATTERN.test(username)) {
    return NextResponse.json(
      { error: "El nombre de usuario debe tener entre 3 y 30 caracteres: letras, números, puntos o guiones bajos." },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const origin = request.nextUrl.origin

  const { data: existingByUsername, error: usernameCheckError } = await admin
    .from("sellers")
    .select("id")
    .eq("username", username)
    .maybeSingle()

  if (usernameCheckError) {
    console.error("Username uniqueness check failed:", usernameCheckError.message)
    return NextResponse.json(
      { error: "No se pudo verificar el nombre de usuario. Intentá de nuevo." },
      { status: 500 },
    )
  }

  if (existingByUsername) {
    return NextResponse.json({ error: "Este nombre de usuario ya existe." }, { status: 400 })
  }

  // admin.generateLink({type:"signup"}) does NOT reliably error on a
  // duplicate email: when "Confirm email" is enabled, Supabase obfuscates
  // the response for an already-confirmed user (anti email-enumeration) and
  // returns a fake user with no error instead of failing. So duplicates
  // must be caught ourselves, against sellers.email / document_number.
  // `email` is already lowercased above, and both handle_new_user and the
  // backfill store it verbatim from auth.users (which GoTrue normalizes to
  // lowercase), so a plain `eq` is an exact, case-safe match — unlike
  // `ilike`, it doesn't treat `%`/`_` in the address as wildcards.
  const { data: existingByEmail, error: emailCheckError } = await admin
    .from("sellers")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (emailCheckError) {
    console.error("Email uniqueness check failed:", emailCheckError.message)
    return NextResponse.json(
      { error: "No se pudo verificar el email. Intentá de nuevo." },
      { status: 500 },
    )
  }

  if (existingByEmail) {
    return NextResponse.json({ error: "Ese email ya está registrado." }, { status: 400 })
  }

  if (documentNumber) {
    // Scoped to (document_number, sellerType): the same DNI/CUIT can be
    // reused across a PERSONAL_SELLER and a BUSINESS_SELLER account (a
    // sole proprietor legitimately does this), but not by two accounts
    // of the same type — see 008_seller_uniqueness.sql.
    const { data: existingByDocument, error: documentCheckError } = await admin
      .from("sellers")
      .select("id")
      .eq("document_number", documentNumber)
      .eq("type", sellerType)
      .maybeSingle()

    if (documentCheckError) {
      console.error("Document uniqueness check failed:", documentCheckError.message)
      return NextResponse.json(
        { error: "No se pudo verificar el DNI/CUIT. Intentá de nuevo." },
        { status: 500 },
      )
    }

    if (existingByDocument) {
      return NextResponse.json(
        { error: "Ese DNI/CUIT ya está registrado." },
        { status: 400 },
      )
    }
  }

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
    // "Database error saving new user" is Supabase's generic wrapper for
    // when handle_new_user's INSERT fails — in practice this almost always
    // means a stray/unconfirmed auth.users row already exists for this
    // email from a previous incomplete signup, colliding with the unique
    // index on lower(email) (see 008_seller_uniqueness.sql). Whatever the
    // exact trigger failure, it's not something the user can act on, so we
    // don't leak the raw message — same fix as the "already" case below.
    const isGenericDbError = linkError?.message === "Database error saving new user"
    const message = linkError?.message?.includes("already") || isGenericDbError
      ? "Ese email ya está registrado."
      : linkError?.message ?? "No se pudo crear la cuenta. Intentá de nuevo."
    console.error("[register] generateLink failed:", linkError?.message)
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

  // Optional avatar — uploaded here (server-side, service-role client)
  // because the browser has no session yet at this point in the flow
  // (email confirmation is still pending, so it can't upload to Storage
  // itself under its own auth). Non-fatal on failure: registration
  // shouldn't fail over a photo, the generic placeholder just keeps
  // showing until the user retries from their profile later.
  let avatarUrl: string | null = null
  if (avatarDataUrl) {
    const match = avatarDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
    const ext = match ? AVATAR_MIME_TO_EXT[match[1]] : undefined
    if (match && ext) {
      try {
        const buffer = Buffer.from(match[2], "base64")
        const path = `${userId}/avatar.${ext}`
        const { error: uploadError } = await admin.storage
          .from("avatars")
          .upload(path, buffer, { contentType: match[1], upsert: true })

        if (uploadError) {
          console.warn("Could not upload avatar:", uploadError.message)
        } else {
          avatarUrl = admin.storage.from("avatars").getPublicUrl(path).data.publicUrl
        }
      } catch (err) {
        console.warn("Unexpected error uploading avatar:", err)
      }
    } else {
      console.warn("Avatar skipped: unrecognized image format")
    }
  }

  // The trigger handle_new_user already created the sellers row —
  // fill in phone (required), document_number, username and avatar.
  // Most failures here are non-fatal (can be completed later from the
  // profile), but a 23505 means a pre-check above raced with a
  // concurrent signup and lost — that one must not be swallowed, or the
  // account ships with a document_number/username the uniqueness
  // constraints were supposed to guarantee is unique.
  const { data: updatedSeller, error: sellerError } = await admin
    .from("sellers")
    .update({
      phone,
      username,
      ...(documentNumber ? { document_number: documentNumber } : {}),
      ...(location ? { location } : {}),
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("user_id", userId)
    .select("id")
    .single()

  if (sellerError?.code === "23505") {
    const message = sellerError.message.includes("username")
      ? "Este nombre de usuario ya existe."
      : "Ese DNI/CUIT ya está registrado."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (sellerError) {
    console.warn("Could not update seller phone/document_number/username:", sellerError.message)
  }

  // terms_acceptances has existed since 001_initial.sql but nothing ever
  // wrote to it — the register flow only ever gated on a client-side
  // checkbox with no server record. Non-fatal on failure: this is an
  // audit trail, not something that should block account creation.
  //
  // ip_address: x-forwarded-for can carry a proxy chain ("client, proxy1,
  // proxy2") — the first entry is the original client. x-real-ip is the
  // fallback some proxies set instead. NextRequest has no reliable `.ip`
  // on the Node runtime (that's Vercel Edge-only), so headers are it.
  if (updatedSeller?.id) {
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null
    const userAgent = request.headers.get("user-agent")

    const { error: termsError } = await admin.from("terms_acceptances").insert({
      seller_id: updatedSeller.id,
      user_id: userId,
      terms_version: "1.0",
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    if (termsError) {
      console.warn("Could not record terms acceptance:", termsError.message)
    }
  }

  const mail = await sendConfirmationEmail({
    to: email,
    fullName,
    confirmUrl,
    logoIconUrl: `${origin}/logo-trans-dark.png`,
    logoWordmarkUrl: `${origin}/solotexto-dark.png`,
  })

  return NextResponse.json({
    ok: true,
    emailSent: mail.sent,
    emailWarning: mail.sent ? undefined : mail.reason,
  })
}
