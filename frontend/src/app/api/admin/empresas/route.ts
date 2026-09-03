import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { findSellerForCompanyConversion } from "@/lib/sellerIdentity.server"
import { saveCompanyLogo } from "@/lib/admin/companyLogo"

const SELECT =
  "id, user_id, name, email, phone, location, address, instagram, website, bio, avatar_url, username, document_number, partner, type, status, created_at"

function randomPassword() {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = new Uint8Array(14)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join("")
}

function usernameFromName(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 20)
  return base.length >= 3 ? base : `empresa.${Date.now().toString(36).slice(-6)}`
}

async function uniqueUsername(admin: ReturnType<typeof createAdminClient>, seed: string) {
  let candidate = seed
  for (let i = 0; i < 12; i++) {
    const { data } = await admin.from("sellers").select("id").eq("username", candidate).maybeSingle()
    if (!data) return candidate
    candidate = `${seed.slice(0, 20)}.${Math.floor(Math.random() * 900 + 100)}`.slice(0, 30)
  }
  return `${seed.slice(0, 16)}.${Date.now().toString(36).slice(-6)}`
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("sellers")
    .select(SELECT)
    .eq("partner", true)
    .order("name", { ascending: true })

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("partner")
          ? "Falta aplicar la migración de empresas (columna partner). Pegala en el SQL Editor de Supabase."
          : error.message,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ companies: data ?? [] })
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const contentType = request.headers.get("content-type") ?? ""
  let name = ""
  let email = ""
  let password = ""
  let usernameRaw = ""
  let phone = ""
  let location = ""
  let address = ""
  let instagram = ""
  let website = ""
  let bio = ""
  let documentNumber = ""
  let logoFile: File | null = null

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData()
    name = String(form.get("name") ?? "").trim()
    email = String(form.get("email") ?? "").trim().toLowerCase()
    password = String(form.get("password") ?? "").trim()
    usernameRaw = String(form.get("username") ?? "").trim().toLowerCase()
    phone = String(form.get("phone") ?? "").trim()
    location = String(form.get("location") ?? "").trim()
    address = String(form.get("address") ?? "").trim()
    instagram = String(form.get("instagram") ?? "").trim()
    website = String(form.get("website") ?? "").trim()
    bio = String(form.get("bio") ?? "").trim()
    documentNumber = String(form.get("documentNumber") ?? "").trim()
    const logo = form.get("logo")
    if (logo instanceof File && logo.size > 0 && logo.type.startsWith("image/")) logoFile = logo
  } else {
    let body: {
      name?: string
      email?: string
      password?: string
      username?: string
      phone?: string
      location?: string
      address?: string
      instagram?: string
      website?: string
      bio?: string
      documentNumber?: string
    }
    try {
      body = (await request.json()) as typeof body
    } catch {
      return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
    }
    name = body.name?.trim() ?? ""
    email = body.email?.trim().toLowerCase() ?? ""
    password = body.password?.trim() ?? ""
    usernameRaw = body.username?.trim().toLowerCase() ?? ""
    phone = body.phone?.trim() ?? ""
    location = body.location?.trim() ?? ""
    address = body.address?.trim() ?? ""
    instagram = body.instagram?.trim() ?? ""
    website = body.website?.trim() ?? ""
    bio = body.bio?.trim() ?? ""
    documentNumber = body.documentNumber?.trim() ?? ""
  }

  if (!name || !phone) {
    return NextResponse.json({ error: "Nombre y teléfono son obligatorios." }, { status: 400 })
  }

  const passwordFinal = password || randomPassword()
  if (passwordFinal.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 })
  }

  const admin = createAdminClient()

  const existing = await findSellerForCompanyConversion(admin, { email, phone })
  if (existing) {
    const { data: seller, error: sellerError } = await admin
      .from("sellers")
      .update({
        name,
        type: "BUSINESS_SELLER",
        partner: true,
        phone,
        identity_verified: true,
        highlight_free: true,
        location: location || null,
        address: address || null,
        instagram: instagram || null,
        website: website || null,
        bio: bio || null,
        ...(documentNumber ? { document_number: documentNumber } : {}),
      })
      .eq("id", existing.id)
      .select(SELECT)
      .single()

    if (sellerError || !seller) {
      return NextResponse.json(
        { error: sellerError?.message ?? "No se pudo convertir el usuario en empresa." },
        { status: 400 },
      )
    }

    let company = seller
    if (logoFile) {
      try {
        const avatarUrl = await saveCompanyLogo(admin, {
          userId: existing.user_id,
          sellerId: seller.id,
          file: logoFile,
        })
        company = { ...seller, avatar_url: avatarUrl }
      } catch (err) {
        console.error("[admin empresas] logo upload", err)
      }
    }

    return NextResponse.json({
      company,
      converted: true,
      previousName: existing.name,
    })
  }

  const username = await uniqueUsername(admin, usernameRaw || usernameFromName(name))
  const authEmail = email || `empresa.${username}.${Date.now().toString(36)}@noreply.compraventaonline.com.ar`

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: authEmail,
    password: passwordFinal,
    email_confirm: true,
    user_metadata: { full_name: name, seller_type: "BUSINESS_SELLER" },
  })

  if (createError || !created.user) {
    const message = createError?.message?.includes("already")
      ? "Ese email ya está registrado."
      : "No se pudo crear la cuenta de la empresa."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const userId = created.user.id
  const { data: seller, error: sellerError } = await admin
    .from("sellers")
    .update({
      name,
      type: "BUSINESS_SELLER",
      partner: true,
      phone,
      username,
      identity_verified: true,
      highlight_free: true,
      location: location || null,
      address: address || null,
      instagram: instagram || null,
      website: website || null,
      bio: bio || null,
      ...(documentNumber ? { document_number: documentNumber } : {}),
    })
    .eq("user_id", userId)
    .select(SELECT)
    .single()

  if (sellerError || !seller) {
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json(
      { error: sellerError?.message ?? "No se pudo completar el perfil de la empresa." },
      { status: 400 },
    )
  }

  let company = seller
  if (logoFile) {
    try {
      const avatarUrl = await saveCompanyLogo(admin, {
        userId,
        sellerId: seller.id,
        file: logoFile,
      })
      company = { ...seller, avatar_url: avatarUrl }
    } catch (err) {
      console.error("[admin empresas] logo upload", err)
    }
  }

  return NextResponse.json({ company, password: passwordFinal })
}
