import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Accepts: multipart/form-data with a "file" field (image).
// Uploads via the service-role client, so it bypasses RLS and never
// falls back to base64 like the seller-facing listing image uploader does.
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo de imagen" }, { status: 400 })
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 })
  }

  const admin = createAdminClient()
  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: uploadError } = await admin.storage
    .from("hero-slides")
    .upload(path, file, { upsert: false, contentType: file.type, cacheControl: "31536000" })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = admin.storage.from("hero-slides").getPublicUrl(path)

  return NextResponse.json({ imageUrl: urlData.publicUrl })
}
