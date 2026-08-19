// ============================================================
// Shared bulk-upload row validation — used by both the preview endpoint
// (parses the uploaded Excel, no DB writes) and the confirm endpoint
// (creates the actual products/listings). Kept in one place on purpose:
// the confirm endpoint re-runs this from scratch instead of trusting
// whatever the client says it saw in the preview, so the two can never
// silently drift into disagreeing about what counts as a valid row.
//
// Category is deliberately NOT a spreadsheet column — sellers pick it
// from a dropdown per-row in the preview screen (a "bulk category
// loader" instead of typing a slug blind). So field validation
// (validateBulkRowFields) and category validation (validateCategory) are
// split: preview only needs the former, confirm needs both.
// ============================================================

export interface BulkRowInput {
  name?: string | null
  brand?: string | null
  description?: string | null
  price?: string | number | null
  currencyCode?: string | null
  condition?: string | null
  stock?: string | number | null
  attributes?: string | Record<string, string> | null
}

export interface ValidatedBulkFields {
  valid: true
  name: string
  brand: string | null
  description: string | null
  price: number
  currencyCode: 'ARS' | 'USD'
  condition: 'NEW' | 'USED'
  stock: number
  attributes: Record<string, string> | null
}

export interface InvalidBulkRow {
  valid: false
  reason: string
}

export function parseAttributes(raw?: string | Record<string, string> | null): Record<string, string> | null {
  if (!raw) return null
  if (typeof raw === 'object') return Object.keys(raw).length > 0 ? raw : null
  if (!raw.trim()) return null
  const attrs: Record<string, string> = {}
  for (const pair of raw.split(';')) {
    const [key, value] = pair.split('=')
    if (key?.trim() && value?.trim()) attrs[key.trim()] = value.trim()
  }
  return Object.keys(attrs).length > 0 ? attrs : null
}

export function validateBulkRowFields(row: BulkRowInput): ValidatedBulkFields | InvalidBulkRow {
  const name = typeof row.name === 'string' ? row.name.trim() : ''
  if (!name) {
    return { valid: false, reason: 'Falta el campo obligatorio: Nombre' }
  }

  const price = typeof row.price === 'number' ? row.price : parseFloat(String(row.price ?? ''))
  if (isNaN(price) || price < 0) {
    return { valid: false, reason: `Precio inválido: "${row.price ?? ''}"` }
  }

  const currencyCode = (typeof row.currencyCode === 'string' ? row.currencyCode.trim() : '').toUpperCase() || 'ARS'
  if (currencyCode !== 'ARS' && currencyCode !== 'USD') {
    return { valid: false, reason: `Moneda inválida: "${row.currencyCode}" (debe ser ARS o USD)` }
  }

  const condition = (typeof row.condition === 'string' ? row.condition.trim() : '').toUpperCase() || 'NEW'
  if (condition !== 'NEW' && condition !== 'USED') {
    return { valid: false, reason: `Condición inválida: "${row.condition}" (debe ser NEW o USED)` }
  }

  const stockRaw = row.stock === '' || row.stock == null ? 0 : row.stock
  const stock = typeof stockRaw === 'number' ? stockRaw : parseInt(String(stockRaw), 10)
  if (isNaN(stock) || stock < 0) {
    return { valid: false, reason: `Stock inválido: "${row.stock ?? ''}"` }
  }

  return {
    valid: true,
    name,
    brand: typeof row.brand === 'string' && row.brand.trim() ? row.brand.trim() : null,
    description: typeof row.description === 'string' && row.description.trim() ? row.description.trim() : null,
    price,
    currencyCode: currencyCode as 'ARS' | 'USD',
    condition: condition as 'NEW' | 'USED',
    stock,
    attributes: parseAttributes(row.attributes),
  }
}

// Validated separately from the rest of the row — the seller assigns it
// via a dropdown in the preview screen (see dashboard's "cargador masivo
// de categoría"), so there's nothing to parse from the spreadsheet, just
// an id to confirm actually exists.
export function validateCategoryId(
  categoryId: string | null | undefined,
  categoriesById: Map<string, { slug: string; name: string }>
): { valid: true; categoryId: string; categoryName: string } | InvalidBulkRow {
  if (!categoryId) {
    return { valid: false, reason: 'Falta seleccionar la categoría' }
  }
  const category = categoriesById.get(categoryId)
  if (!category) {
    return { valid: false, reason: 'La categoría seleccionada ya no existe' }
  }
  return { valid: true, categoryId, categoryName: category.name }
}

// Spanish headers shown in the downloadable template and expected when
// reading an uploaded file, mapped back to the internal field names above.
// No "Categoría" column (assigned per-row in the preview screen instead)
// and no "Imágenes" column (attached via drag-and-drop in that same
// screen) — the spreadsheet only carries the fields that are genuinely
// faster to type in bulk than to pick one by one.
export const BULK_HEADERS_ES: { header: string; key: keyof BulkRowInput }[] = [
  { header: 'Nombre', key: 'name' },
  { header: 'Marca', key: 'brand' },
  { header: 'Descripción', key: 'description' },
  { header: 'Moneda', key: 'currencyCode' },
  { header: 'Precio', key: 'price' },
  { header: 'Condición', key: 'condition' },
  { header: 'Stock', key: 'stock' },
  { header: 'Atributos', key: 'attributes' },
]
