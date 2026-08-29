import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; message?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const name = (body.name ?? "").trim()
  const email = (body.email ?? "").trim()
  const message = (body.message ?? "").trim()
  if (name.length < 2 || !email.includes("@") || message.length < 5) {
    return NextResponse.json({ error: "Completá nombre, email y mensaje." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from("support_messages").insert({
    name: name.slice(0, 120),
    email: email.slice(0, 200),
    message: message.slice(0, 4000),
    status: "PENDING",
  })

  if (error) {
    console.error("[support-messages] insert", error)
    return NextResponse.json({ error: "No se pudo enviar la consulta." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
