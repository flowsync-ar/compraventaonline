import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { findIdentityConflicts } from "@/lib/sellerIdentity.server"
import { identityConflictPayload } from "@/lib/sellerIdentity"

const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/

// Fills in the fields Google OAuth never supplies (username, phone, seller
// type, document number, terms acceptance) for a seller row that
// handle_new_user() already created bare-bones on first sign-in — see
// /auth/callback/route.ts for how a user ends up here.
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: {
    username?: string
    sellerType?: "PERSONAL_SELLER" | "BUSINESS_SELLER"
    documentNumber?: string
    phone?: string
    location?: string
    acceptTerms?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const username = body.username?.trim().toLowerCase()
  const sellerType = body.sellerType === "BUSINESS_SELLER" ? "BUSINESS_SELLER" : "PERSONAL_SELLER"
  const documentNumber = body.documentNumber?.trim()
  const phone = body.phone?.trim()
  const location = body.location?.trim() || null
  const acceptTerms = body.acceptTerms === true

  if (!username || !USERNAME_PATTERN.test(username)) {
    return NextResponse.json(
      { error: "El nombre de usuario debe tener entre 3 y 30 caracteres: letras, números, puntos o guiones bajos." },
      { status: 400 },
    )
  }
  if (!phone) {
    return NextResponse.json({ error: "El celular es obligatorio." }, { status: 400 })
  }
  if (!acceptTerms) {
    return NextResponse.json(
      { error: "Debes aceptar los términos y condiciones para continuar." },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  const { data: existingUsername } = await admin
    .from("sellers")
    .select("id")
    .eq("username", username)
    .neq("user_id", user.id)
    .maybeSingle()
  if (existingUsername) {
    return NextResponse.json({ error: "Este nombre de usuario ya existe." }, { status: 400 })
  }

  const identity = await findIdentityConflicts(admin, {
    documentNumber,
    phone,
    sellerType,
    excludeUserId: user.id,
  })
  const identityError = identityConflictPayload(identity.documentTaken, identity.phoneTaken)
  if (identityError) {
    return NextResponse.json(identityError, { status: 400 })
  }

  const { data: updatedSeller, error: updateError } = await admin
    .from("sellers")
    .update({
      username,
      type: sellerType,
      document_number: documentNumber || null,
      phone,
      location,
    })
    .eq("user_id", user.id)
    .select("id")
    .single()

  if (updateError || !updatedSeller) {
    console.error("[complete-profile] failed to update seller", updateError)
    return NextResponse.json({ error: "No se pudo completar el perfil." }, { status: 500 })
  }

  // Same audit-trail pattern as register/route.ts — non-fatal on failure.
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  const userAgent = request.headers.get("user-agent")
  const { error: termsError } = await admin.from("terms_acceptances").insert({
    seller_id: updatedSeller.id,
    user_id: user.id,
    ip_address: ipAddress,
    user_agent: userAgent,
  })
  if (termsError) {
    console.error("[complete-profile] failed to record terms acceptance", termsError.message)
  }

  return NextResponse.json({ ok: true })
}
