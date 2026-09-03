import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { findIdentityConflicts } from "@/lib/sellerIdentity.server"
import { identityConflictPayload } from "@/lib/sellerIdentity"

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const withFantasma =
    "id, user_id, name, type, phone, location, status, created_at, identity_verified, highlight_free, fantasma"
  const withoutFantasma =
    "id, user_id, name, type, phone, location, status, created_at, identity_verified, highlight_free"

  let { data, error } = await admin.from("sellers").select(withFantasma).order("created_at", { ascending: false })
  if (error && /fantasma/i.test(error.message)) {
    const retry = await admin.from("sellers").select(withoutFantasma).order("created_at", { ascending: false })
    data = (retry.data ?? []).map((row) => ({ ...row, fantasma: false }))
    error = retry.error
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Email lives in auth.users, not in `sellers` — only reachable via the
  // Admin API (not a regular PostgREST join, `auth` schema isn't exposed).
  const { data: authList, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailByUserId = new Map(authList?.users.map((u) => [u.id, u.email]) ?? [])
  if (authError) {
    console.warn("Could not load auth emails:", authError.message)
  }

  const users = (data ?? []).map((seller) => ({
    ...seller,
    email: emailByUserId.get(seller.user_id) ?? null,
  }))

  return NextResponse.json({ users })
}

const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/

interface CreateUserPayload {
  email?: string
  password?: string
  fullName?: string
  sellerType?: "PERSONAL_SELLER" | "BUSINESS_SELLER"
  documentNumber?: string
  phone?: string
  location?: string
  username?: string
  identityVerified?: boolean
  highlightFree?: boolean
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: CreateUserPayload
  try {
    body = (await request.json()) as CreateUserPayload
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password
  const fullName = body.fullName?.trim()
  const sellerType = body.sellerType === "BUSINESS_SELLER" ? "BUSINESS_SELLER" : "PERSONAL_SELLER"
  const documentNumber = body.documentNumber?.trim() || ""
  const phone = body.phone?.trim()
  const location = body.location?.trim() || ""
  const username = body.username?.trim().toLowerCase()
  const identityVerified = body.identityVerified === true
  const highlightFree = body.highlightFree === true

  if (!email || !password || !fullName || !phone || !username) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 })
  }

  if (!USERNAME_PATTERN.test(username)) {
    return NextResponse.json(
      { error: "El nombre de usuario debe tener entre 3 y 30 caracteres: letras, números, puntos o guiones bajos." },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  const { data: existingByUsername, error: usernameCheckError } = await admin
    .from("sellers")
    .select("id")
    .eq("username", username)
    .maybeSingle()

  if (usernameCheckError) {
    return NextResponse.json({ error: "No se pudo verificar el nombre de usuario." }, { status: 500 })
  }
  if (existingByUsername) {
    return NextResponse.json({ error: "Este nombre de usuario ya existe." }, { status: 400 })
  }

  const { data: existingByEmail, error: emailCheckError } = await admin
    .from("sellers")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (emailCheckError) {
    return NextResponse.json({ error: "No se pudo verificar el email." }, { status: 500 })
  }
  if (existingByEmail) {
    return NextResponse.json({ error: "Ese email ya está registrado." }, { status: 400 })
  }

  const identity = await findIdentityConflicts(admin, {
    documentNumber,
    phone,
    sellerType,
  })
  const identityError = identityConflictPayload(identity.documentTaken, identity.phoneTaken)
  if (identityError) {
    return NextResponse.json(identityError, { status: 400 })
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, seller_type: sellerType },
  })

  if (createError || !created.user) {
    const message = createError?.message?.includes("already")
      ? "Ese email ya está registrado."
      : "No se pudo crear la cuenta."
    console.error("[admin/users] createUser failed:", createError?.message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const userId = created.user.id

  const { data: seller, error: sellerError } = await admin
    .from("sellers")
    .update({
      name: fullName,
      type: sellerType,
      phone,
      username,
      identity_verified: identityVerified,
      highlight_free: highlightFree,
      ...(documentNumber ? { document_number: documentNumber } : {}),
      ...(location ? { location } : {}),
    })
    .eq("user_id", userId)
    .select("id, user_id, name, type, phone, location, status, created_at, identity_verified, highlight_free")
    .single()

  if (sellerError || !seller) {
    await admin.auth.admin.deleteUser(userId)
    const message =
      sellerError?.code === "23505"
        ? sellerError.message.includes("username")
          ? "Este nombre de usuario ya existe."
          : "Ese DNI/CUIT ya está registrado."
        : "No se pudo completar el perfil del usuario."
    console.error("[admin/users] seller update failed:", sellerError?.message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({
    user: { ...seller, email },
  })
}
