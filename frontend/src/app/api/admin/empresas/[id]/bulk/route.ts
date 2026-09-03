import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { publishBulkRows, type ConfirmRow } from "@/lib/bulk/publishRows"

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

  let rows: ConfirmRow[]
  try {
    const body = await request.json()
    rows = Array.isArray(body?.rows) ? body.rows : []
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No hay filas para publicar" }, { status: 400 })
  }

  const result = await publishBulkRows(admin, sellerId, rows)
  return NextResponse.json(result)
}
