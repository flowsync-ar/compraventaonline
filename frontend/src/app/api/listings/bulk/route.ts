import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { publishBulkRows, type ConfirmRow } from "@/lib/bulk/publishRows"

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

  let rows: ConfirmRow[]
  try {
    const body = await req.json()
    rows = Array.isArray(body?.rows) ? body.rows : []
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No hay filas para publicar" }, { status: 400 })
  }

  const result = await publishBulkRows(createAdminClient(), sellerRow.id, rows)
  return NextResponse.json(result)
}
