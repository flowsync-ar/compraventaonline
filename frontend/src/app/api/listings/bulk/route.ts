import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TablesInsert } from '@/lib/supabase/types'
import ExcelJS from 'exceljs'

// ============================================================
// Excel field contract (matches the template downloaded from the
// "Subida Masiva" tab in the seller dashboard)
// Required: name, category_slug, price
// Optional: brand, description, condition, stock, attributes, images
// ============================================================

interface ExcelRow {
  name: string
  brand?: string
  description?: string
  category_slug: string
  price: string
  condition?: string
  stock?: string
  attributes?: string
  images?: string
}

interface FailedRow {
  row: number
  reason: string
}

const EXPECTED_HEADERS = [
  'name',
  'brand',
  'description',
  'category_slug',
  'price',
  'condition',
  'stock',
  'attributes',
  'images',
]

async function parseExcel(buffer: ArrayBuffer): Promise<ExcelRow[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const headerRow = sheet.getRow(1)
  const headers: string[] = []
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? '').trim()
  })

  const rows: ExcelRow[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // header
    const values: Record<string, string> = {}
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber]
      if (!header) return
      values[header] = cell.value == null ? '' : String(cell.value).trim()
    })
    // Skip fully blank rows (e.g. trailing empty rows in the sheet)
    if (Object.values(values).every((v) => !v)) return
    rows.push(values as unknown as ExcelRow)
  })

  return rows
}

function parseAttributes(raw?: string): Record<string, string> | null {
  if (!raw?.trim()) return null
  const attrs: Record<string, string> = {}
  for (const pair of raw.split(';')) {
    const [key, value] = pair.split('=')
    if (key?.trim() && value?.trim()) attrs[key.trim()] = value.trim()
  }
  return Object.keys(attrs).length > 0 ? attrs : null
}

function parseImages(raw?: string): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(';')
    .map((url) => url.trim())
    .filter(Boolean)
}

type NewProduct = TablesInsert<'products'>
type NewListing = Omit<TablesInsert<'listings'>, 'product_id' | 'seller_id'>

function validateRow(
  row: ExcelRow,
  categoryIdBySlug: Map<string, string>
): { valid: true; product: NewProduct; listing: NewListing } | { valid: false; reason: string } {
  if (!row.name?.trim()) {
    return { valid: false, reason: 'Falta el campo obligatorio: name' }
  }

  const price = parseFloat(row.price)
  if (isNaN(price) || price < 0) {
    return { valid: false, reason: `Precio inválido: "${row.price}"` }
  }

  const slug = row.category_slug?.trim()
  if (!slug) {
    return { valid: false, reason: 'Falta el campo obligatorio: category_slug' }
  }
  const categoryId = categoryIdBySlug.get(slug)
  if (!categoryId) {
    return { valid: false, reason: `category_slug desconocido: "${slug}"` }
  }

  const condition = (row.condition?.trim() || 'NEW').toUpperCase()
  if (condition !== 'NEW' && condition !== 'USED') {
    return { valid: false, reason: `Condición inválida: "${row.condition}" (debe ser NEW o USED)` }
  }

  const stock = row.stock?.trim() ? parseInt(row.stock, 10) : 0
  if (isNaN(stock) || stock < 0) {
    return { valid: false, reason: `Stock inválido: "${row.stock}"` }
  }

  const images = parseImages(row.images)

  return {
    valid: true,
    product: {
      name: row.name.trim(),
      brand: row.brand?.trim() || null,
      description: row.description?.trim() || null,
      category_id: categoryId,
      images: images.length > 0 ? images : null,
      attributes: parseAttributes(row.attributes),
    },
    listing: {
      price,
      condition,
      stock,
      featured_plan: 'FREE',
      status: 'APPROVED',
      image_url: images[0] ?? null,
    },
  }
}

// ============================================================
// POST /api/listings/bulk
// Accepts: multipart/form-data with a "file" field (.xlsx)
// Creates a `products` row + a `listings` row per valid data row
// (mirrors the individual "Publicar Artículo" flow).
// Returns: { inserted: number, failed: Array<{row, reason}> }
// Auth: seller session required
// ============================================================
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: sellerRow, error: sellerError } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (sellerError || !sellerRow) {
    return NextResponse.json({ error: 'Only sellers can use this endpoint' }, { status: 403 })
  }

  const sellerId = sellerRow.id

  let rows: ExcelRow[]
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Missing "file" field in form data' }, { status: 400 })
    }

    const buffer = await (file as File).arrayBuffer()
    rows = await parseExcel(buffer)
  } catch (err) {
    return NextResponse.json(
      { error: `No pudimos leer el archivo Excel: ${err instanceof Error ? err.message : 'formato inválido'}` },
      { status: 400 }
    )
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'El archivo Excel no tiene filas de datos (solo encabezado o está vacío)' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // Category slug -> id lookup (small table, fetched once)
  const { data: categories } = await admin.from('categories').select('id, slug')
  const categoryIdBySlug = new Map((categories ?? []).map((c) => [c.slug, c.id]))

  const failed: FailedRow[] = []
  let inserted = 0

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2 // row 1 is header
    const result = validateRow(rows[i], categoryIdBySlug)
    if (!result.valid) {
      failed.push({ row: rowNumber, reason: result.reason })
      continue
    }

    const { data: productData, error: productError } = await admin
      .from('products')
      .insert(result.product)
      .select('id')
      .single()

    if (productError || !productData) {
      failed.push({ row: rowNumber, reason: productError?.message ?? 'No se pudo crear el producto' })
      continue
    }

    const { error: listingError } = await admin.from('listings').insert({
      ...result.listing,
      product_id: productData.id,
      seller_id: sellerId,
    })

    if (listingError) {
      failed.push({ row: rowNumber, reason: listingError.message })
      continue
    }

    inserted++
  }

  return NextResponse.json({ inserted, failed, expectedHeaders: EXPECTED_HEADERS })
}
