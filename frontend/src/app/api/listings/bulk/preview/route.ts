import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'
import { validateBulkRowFields, BULK_HEADERS_ES, type BulkRowInput } from '@/lib/bulk/validateRow'

async function parseExcel(buffer: ArrayBuffer): Promise<BulkRowInput[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  // Spanish header text -> internal field name (see BULK_HEADERS_ES).
  // A column whose header doesn't match any known label is just ignored
  // instead of erroring — keeps the parser tolerant of stray columns.
  const headerToKey = new Map(BULK_HEADERS_ES.map((h) => [h.header, h.key]))
  const columnKeys: (keyof BulkRowInput | undefined)[] = []
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    columnKeys[colNumber] = headerToKey.get(String(cell.value ?? '').trim())
  })

  const rows: BulkRowInput[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // header
    const values: BulkRowInput = {}
    let hasAnyValue = false
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = columnKeys[colNumber]
      if (!key) return
      const value = cell.value == null ? '' : String(cell.value).trim()
      if (value) hasAnyValue = true
      ;(values as Record<string, string>)[key] = value
    })
    if (!hasAnyValue) return // skip fully blank rows (e.g. trailing rows)
    rows.push(values)
  })

  return rows
}

// ============================================================
// POST /api/listings/bulk/preview
// Parses + validates the uploaded Excel's fields (name, price, currency,
// condition, stock, attributes) WITHOUT writing anything to the DB.
// Category isn't a spreadsheet column — the seller assigns it per row
// from a dropdown in the preview screen, and photos are attached there
// via drag-and-drop — so neither is touched here.
// ============================================================
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: sellerRow, error: sellerError } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (sellerError || !sellerRow) {
    return NextResponse.json({ error: 'Esta acción es solo para vendedores' }, { status: 403 })
  }

  let parsedRows: BulkRowInput[]
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Falta el campo "file" en el formulario' }, { status: 400 })
    }

    const buffer = await (file as File).arrayBuffer()
    parsedRows = await parseExcel(buffer)
  } catch (err) {
    return NextResponse.json(
      { error: `No pudimos leer el archivo Excel: ${err instanceof Error ? err.message : 'formato inválido'}` },
      { status: 400 }
    )
  }

  if (parsedRows.length === 0) {
    return NextResponse.json(
      { error: 'El archivo Excel no tiene filas de datos (solo encabezado o está vacío)' },
      { status: 400 }
    )
  }

  const rows = parsedRows.map((row, i) => ({
    rowNumber: i + 2, // row 1 is the header
    ...validateBulkRowFields(row),
  }))

  return NextResponse.json({ rows })
}
