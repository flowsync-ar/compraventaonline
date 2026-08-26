import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { getWebsiteStats, getWebsiteMetric } from "@/lib/umami/client"

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const endAt = Date.now()
  const startAt = endAt - SEVEN_DAYS_MS

  try {
    const [stats, topPages, topReferrers] = await Promise.all([
      getWebsiteStats(startAt, endAt),
      getWebsiteMetric("path", startAt, endAt, 10),
      getWebsiteMetric("referrer", startAt, endAt, 10),
    ])
    return NextResponse.json({ stats, topPages, topReferrers, rangeLabel: "Últimos 7 días" })
  } catch (err) {
    console.error("[api/admin/metrics/umami]", err)
    const message = err instanceof Error ? err.message : "No se pudo consultar Umami"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
