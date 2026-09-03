import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id: sellerId } = await context.params
  const admin = createAdminClient()
  const { data: company } = await admin.from("sellers").select("id").eq("id", sellerId).eq("partner", true).single()
  if (!company) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
  }

  const form = await request.formData()
  const rowNumber = String(form.get("rowNumber") ?? "0").replace(/\D/g, "") || "0"
  const files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0)
  if (files.length === 0) {
    return NextResponse.json({ error: "No hay fotos para subir." }, { status: 400 })
  }

  const urls: string[] = []
  for (const file of files) {
    const safeName = file.name.replace(/[^\w.-]+/g, "-") || "foto.webp"
    const path = `${sellerId}/bulk-${rowNumber}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`
    const { error } = await admin.storage.from("listings").upload(path, file, {
      upsert: false,
      cacheControl: "31536000",
      contentType: file.type || "image/webp",
    })
    if (error) {
      console.error("[admin empresas bulk images]", error.message)
      continue
    }
    const { data: urlData } = admin.storage.from("listings").getPublicUrl(path)
    if (urlData?.publicUrl) urls.push(urlData.publicUrl)
  }

  if (urls.length === 0) {
    return NextResponse.json({ error: "No se pudieron subir las fotos." }, { status: 400 })
  }

  return NextResponse.json({ urls })
}
