import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { captureSiteMetrics, persistSiteMetrics } from "@/lib/siteMetrics"

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("site_metric_snapshots")
    .select("id, captured_at, captured_at_art, label, payload")
    .order("captured_at", { ascending: false })
    .limit(90)

  if (error) {
    return NextResponse.json({ error: error.message, needsMigration: true }, { status: 500 })
  }

  return NextResponse.json({ snapshots: data ?? [] })
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const snapshot = await captureSiteMetrics(admin, "manual")
    await persistSiteMetrics(admin, snapshot)
    return NextResponse.json({ snapshot })
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo guardar el corte"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
