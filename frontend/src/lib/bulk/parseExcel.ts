import ExcelJS from "exceljs"
import { BULK_HEADERS_ES, type BulkRowInput } from "@/lib/bulk/validateRow"

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value as unknown
  if (v == null || v === "") return ""
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  if (typeof v === "string") return v.trim()
  if (typeof v === "object") {
    const obj = v as {
      result?: unknown
      text?: unknown
      richText?: { text?: string }[]
      hyperlink?: string
    }
    if (obj.result != null && obj.result !== "") return String(obj.result).trim()
    if (Array.isArray(obj.richText)) return obj.richText.map((part) => part.text ?? "").join("").trim()
    if (obj.text != null) return String(obj.text).trim()
    if (obj.hyperlink) return String(obj.hyperlink).trim()
  }
  return ""
}

function isJunkName(name: string) {
  if (name.length < 2) return true
  if (name === "[object Object]") return true
  return /^[\s\u00a0\u200b-\u200d\ufeff]+$/.test(name)
}

function hasNumericPrice(price: string) {
  if (!price) return false
  const n = parseFloat(price.replace(/\s/g, "").replace(",", "."))
  return Number.isFinite(n) && n >= 0
}

export async function parseBulkExcel(buffer: ArrayBuffer): Promise<BulkRowInput[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const headerToKey = new Map(BULK_HEADERS_ES.map((h) => [h.header, h.key]))
  const columnKeys: (keyof BulkRowInput | undefined)[] = []
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    columnKeys[colNumber] = headerToKey.get(cellText(cell))
  })

  const rows: BulkRowInput[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const values: BulkRowInput = {}
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = columnKeys[colNumber]
      if (!key) return
      const value = cellText(cell)
      if (value) (values as Record<string, string>)[key] = value
    })
    const name = String(values.name ?? "").trim()
    const price = String(values.price ?? "").trim()
    // Excel leaves styled/formula leftover rows; they are not products.
    if (isJunkName(name) || !hasNumericPrice(price)) return
    rows.push(values)
  })

  return rows
}
