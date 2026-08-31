import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { findIdentityConflicts } from "@/lib/sellerIdentity.server"
import { identityConflictPayload } from "@/lib/sellerIdentity"

export async function PATCH(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: {
    name?: string
    type?: "PERSONAL_SELLER" | "BUSINESS_SELLER"
    phone?: string
    location?: string | null
    documentNumber?: string | null
    bio?: string | null
    bankCbu?: string | null
    bankAlias?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const sellerType = body.type === "BUSINESS_SELLER" ? "BUSINESS_SELLER" : "PERSONAL_SELLER"
  const admin = createAdminClient()

  const identity = await findIdentityConflicts(admin, {
    documentNumber: body.documentNumber,
    phone: body.phone,
    sellerType,
    excludeUserId: user.id,
  })
  const identityError = identityConflictPayload(identity.documentTaken, identity.phoneTaken)
  if (identityError) {
    return NextResponse.json(identityError, { status: 400 })
  }

  const { error } = await admin
    .from("sellers")
    .update({
      name: body.name,
      type: sellerType,
      phone: body.phone,
      location: body.location || null,
      document_number: body.documentNumber || null,
      bio: body.bio || null,
      bank_cbu: body.bankCbu || null,
      bank_alias: body.bankAlias || null,
    })
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
