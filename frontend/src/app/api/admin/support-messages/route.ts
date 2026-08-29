import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

const ARCHIVE_MARK = "\n\n[[CVO_ARCHIVED]]"

function stripArchiveMark(message: string): string {
  return message.replace(/(?:\n)*\[\[CVO_ARCHIVED\]\]\s*$/, "")
}

function withArchiveMark(message: string): string {
  const clean = stripArchiveMark(message)
  return `${clean}${ARCHIVE_MARK}`
}

function isArchivedRow(row: { status: string; message: string }): boolean {
  return row.status === "ARCHIVED" || row.message.includes("[[CVO_ARCHIVED]]")
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("support_messages")
    .select("id, name, email, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const messages = (data ?? []).map((row) => ({
    ...row,
    message: stripArchiveMark(row.message),
    status: isArchivedRow(row) ? "ARCHIVED" : row.status,
  }))

  return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } })
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: { id?: string; status?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }
  if (!body.id || (body.status !== "DONE" && body.status !== "PENDING" && body.status !== "ARCHIVED")) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: current, error: readError } = await admin
    .from("support_messages")
    .select("id, message, status")
    .eq("id", body.id)
    .maybeSingle()

  if (readError || !current) {
    return NextResponse.json({ error: readError?.message ?? "No encontrada" }, { status: 404 })
  }

  if (body.status === "ARCHIVED") {
    const { error } = await admin.from("support_messages").update({ status: "ARCHIVED" }).eq("id", body.id)
    if (error) {
      const { error: markError } = await admin
        .from("support_messages")
        .update({ message: withArchiveMark(current.message) })
        .eq("id", body.id)
      if (markError) {
        return NextResponse.json({ error: markError.message }, { status: 500 })
      }
    }
    return NextResponse.json({ ok: true })
  }

  const { error } = await admin
    .from("support_messages")
    .update({
      status: body.status,
      message: stripArchiveMark(current.message),
    })
    .eq("id", body.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
