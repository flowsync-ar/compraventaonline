import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { captureSiteMetrics, persistSiteMetrics } from "@/lib/siteMetrics"

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  const header = request.headers.get("authorization")
  if (secret && header === `Bearer ${secret}`) return true
  // Vercel Cron sends this on Hobby/Pro when the job is invoked by the platform.
  if (request.headers.get("x-vercel-cron") === "1") return true
  return false
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const snapshot = await captureSiteMetrics(admin, "cron")
    await persistSiteMetrics(admin, snapshot)
    return NextResponse.json({
      ok: true,
      capturedAtArt: snapshot.capturedAtArt,
      sellers: snapshot.catalog.sellers,
      listingsApproved: snapshot.catalog.listingsApproved,
      uniqueVisitors: snapshot.traffic.uniqueVisitors,
      storageMb: Math.round((snapshot.infra.storageBytes / (1024 * 1024)) * 10) / 10,
    })
  } catch (err) {
    console.error("[cron/site-metrics]", err)
    const message = err instanceof Error ? err.message : "No se pudo guardar el corte"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
