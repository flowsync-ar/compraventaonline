import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { parseBulkExcel } from "@/lib/bulk/parseExcel"
import { validateBulkRowFields } from "@/lib/bulk/validateRow"

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { data: sellerRow, error: sellerError } = await supabase
    .from("sellers")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (sellerError || !sellerRow) {
    return NextResponse.json({ error: "Esta acción es solo para vendedores" }, { status: 403 })
  }

  let parsedRows
  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: 'Falta el campo "file" en el formulario' }, { status: 400 })
    }

    parsedRows = await parseBulkExcel(await (file as File).arrayBuffer())
  } catch (err) {
    return NextResponse.json(
      { error: `No pudimos leer el archivo Excel: ${err instanceof Error ? err.message : "formato inválido"}` },
      { status: 400 },
    )
  }

  if (parsedRows.length === 0) {
    return NextResponse.json(
      { error: "El archivo Excel no tiene filas de datos (solo encabezado o está vacío)" },
      { status: 400 },
    )
  }

  const rows = parsedRows.map((row, i) => ({
    rowNumber: i + 2,
    ...validateBulkRowFields(row),
  }))

  return NextResponse.json({ rows })
}
