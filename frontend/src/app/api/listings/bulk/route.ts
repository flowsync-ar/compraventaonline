import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// ============================================================
// Admin client — uses service role key, bypasses RLS.
// Never exposed to the browser.
// ============================================================
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase admin env vars')
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

// ============================================================
// CSV field contract
// Each row must provide these columns (header names):
//   title, description, price, category_id, currency_id,
//   stock, image_url, status
// Required: title, price, category_id
// ============================================================

interface CsvRow {
  title: string
  description?: string
  price: string
  category_id: string
  currency_id?: string
  stock?: string
  image_url?: string
  status?: string
}

interface FailedRow {
  row: number
  reason: string
}

function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))

  return lines.slice(1).map((line) => {
    // Basic CSV parse — handles quoted fields with embedded commas
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    return Object.fromEntries(
      headers.map((header, idx) => [header, values[idx] ?? ''])
    ) as unknown as CsvRow
  })
}

function validateRow(
  row: CsvRow,
  rowIndex: number
): { valid: true; listing: Record<string, unknown> } | { valid: false; reason: string } {
  if (!row.title?.trim()) {
    return { valid: false, reason: 'Missing required field: title' }
  }

  const price = parseFloat(row.price)
  if (isNaN(price) || price < 0) {
    return { valid: false, reason: `Invalid price: "${row.price}"` }
  }

  if (!row.category_id?.trim()) {
    return { valid: false, reason: 'Missing required field: category_id' }
  }

  const validStatuses = ['ACTIVE', 'PAUSED', 'SOLD', 'DELETED']
  const status = row.status?.trim()?.toUpperCase() || 'ACTIVE'
  if (!validStatuses.includes(status)) {
    return { valid: false, reason: `Invalid status: "${row.status}"` }
  }

  const stock = row.stock ? parseInt(row.stock, 10) : 0
  if (isNaN(stock) || stock < 0) {
    return { valid: false, reason: `Invalid stock: "${row.stock}"` }
  }

  return {
    valid: true,
    listing: {
      title: row.title.trim(),
      description: row.description?.trim() || null,
      price,
      category_id: row.category_id.trim(),
      currency_id: row.currency_id?.trim() || null,
      stock,
      image_url: row.image_url?.trim() || null,
      status,
    },
  }
}

// ============================================================
// POST /api/listings/bulk
// Accepts: multipart/form-data with a "file" field (CSV)
// Returns: { inserted: number, failed: Array<{row, reason}> }
// Auth: seller session required
// ============================================================
export async function POST(req: NextRequest) {
  // 1. Verify the caller is an authenticated seller
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Look up seller record for this user
  const { data: sellerRow, error: sellerError } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (sellerError || !sellerRow) {
    return NextResponse.json(
      { error: 'Only sellers can use this endpoint' },
      { status: 403 }
    )
  }

  const sellerId = sellerRow.id

  // 3. Parse multipart form — expect a "file" field
  let csvText: string
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'Missing "file" field in form data' },
        { status: 400 }
      )
    }

    csvText = await (file as File).text()
  } catch {
    return NextResponse.json(
      { error: 'Could not parse multipart form data' },
      { status: 400 }
    )
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 })
  }

  // 4. Parse and validate CSV rows
  const rows = parseCSV(csvText)
  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'CSV has no data rows (only header or blank)' },
      { status: 400 }
    )
  }

  const validListings: Record<string, unknown>[] = []
  const failed: FailedRow[] = []

  for (let i = 0; i < rows.length; i++) {
    const result = validateRow(rows[i], i + 2) // row 1 is header
    if (result.valid) {
      // Attach the authenticated seller_id — the CSV must not control this
      validListings.push({ ...result.listing, seller_id: sellerId })
    } else {
      failed.push({ row: i + 2, reason: result.reason })
    }
  }

  // 5. Bulk insert valid rows via admin client (bypasses RLS)
  let inserted = 0
  if (validListings.length > 0) {
    const admin = createAdminClient()

    // Insert in batches of 500 to stay within PostgREST limits
    const BATCH_SIZE = 500
    for (let offset = 0; offset < validListings.length; offset += BATCH_SIZE) {
      const batch = validListings.slice(offset, offset + BATCH_SIZE)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError, count } = await admin
        .from('listings')
        .insert(batch as any[])
        .select('id')

      if (insertError) {
        // Mark the whole batch as failed — we can't pinpoint individual rows at this point
        const batchStart = offset + 2 // +2: 1-indexed + header row
        for (let j = 0; j < batch.length; j++) {
          failed.push({ row: batchStart + j, reason: insertError.message })
        }
      } else {
        inserted += count ?? batch.length
      }
    }
  }

  return NextResponse.json({ inserted, failed })
}
