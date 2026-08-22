import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Separate from the general settings PUT — this is an instant on/off
// switch (checked by proxy.ts on every page request), not part of the
// "Guardar" price-list form flow.
export async function PUT(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: { maintenanceMode?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  if (typeof body.maintenanceMode !== "boolean") {
    return NextResponse.json({ error: "maintenanceMode debe ser true o false" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("platform_settings")
    .update({ maintenance_mode: body.maintenanceMode })
    .eq("id", true)
    .select("maintenance_mode")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ settings: data })
}
