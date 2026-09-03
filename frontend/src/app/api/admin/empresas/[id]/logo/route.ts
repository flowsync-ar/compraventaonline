import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { saveCompanyLogo } from "@/lib/admin/companyLogo"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params
  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Subí una imagen de logo." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: company, error: companyError } = await admin
    .from("sellers")
    .select("id, user_id")
    .eq("id", id)
    .eq("partner", true)
    .single()
  if (companyError || !company) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
  }

  try {
    const avatarUrl = await saveCompanyLogo(admin, {
      userId: company.user_id,
      sellerId: company.id,
      file,
    })
    return NextResponse.json({ avatar_url: avatarUrl })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo subir el logo." },
      { status: 500 },
    )
  }
}
