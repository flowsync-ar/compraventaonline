import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("platform_settings")
    .select("highlight_price, highlight_duration_days")
    .eq("id", true)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ settings: data })
}

export async function PUT(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: { highlightPrice?: number; highlightDurationDays?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const highlightPrice = Number(body.highlightPrice)
  const highlightDurationDays = Number(body.highlightDurationDays)
  if (!Number.isFinite(highlightPrice) || highlightPrice <= 0) {
    return NextResponse.json({ error: "El precio debe ser un número mayor a 0" }, { status: 400 })
  }
  if (!Number.isInteger(highlightDurationDays) || highlightDurationDays <= 0) {
    return NextResponse.json({ error: "La duración debe ser un número entero de días mayor a 0" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("platform_settings")
    .update({
      highlight_price: highlightPrice,
      highlight_duration_days: highlightDurationDays,
    })
    .eq("id", true)
    .select("highlight_price, highlight_duration_days")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ settings: data })
}
