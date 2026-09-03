import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseBulkExcel } from "@/lib/bulk/parseExcel"
import { validateBulkRowFields } from "@/lib/bulk/validateRow"

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

  let parsedRows
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Falta el archivo Excel." }, { status: 400 })
    }
    parsedRows = await parseBulkExcel(await (file as File).arrayBuffer())
  } catch (err) {
    return NextResponse.json(
      { error: `No pudimos leer el archivo Excel: ${err instanceof Error ? err.message : "formato inválido"}` },
      { status: 400 },
    )
  }

  if (parsedRows.length === 0) {
    return NextResponse.json({ error: "El Excel no tiene filas de datos." }, { status: 400 })
  }

  return NextResponse.json({
    rows: parsedRows.map((row, i) => ({
      rowNumber: i + 2,
      ...validateBulkRowFields(row),
    })),
  })
}
