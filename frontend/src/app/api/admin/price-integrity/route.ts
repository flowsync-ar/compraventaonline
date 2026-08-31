import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()

  const [
    highRisk,
    warningRisk,
    confirmedAnyway,
    misleadingPending,
    misleadingConfirmed,
    respected,
    notRespected,
  ] = await Promise.all([
    admin.from("listings").select("id", { count: "exact", head: true }).eq("price_risk", "high"),
    admin.from("listings").select("id", { count: "exact", head: true }).eq("price_risk", "warning"),
    admin
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("price_seller_confirmed", true)
      .neq("price_risk", "normal"),
    admin
      .from("product_reports")
      .select("id", { count: "exact", head: true })
      .eq("reason", "MISLEADING_PRICE")
      .eq("status", "PENDING"),
    admin
      .from("product_reports")
      .select("id", { count: "exact", head: true })
      .eq("reason", "MISLEADING_PRICE")
      .eq("status", "CONFIRMED"),
    admin.from("seller_ratings").select("id", { count: "exact", head: true }).eq("respected_published_price", true),
    admin.from("seller_ratings").select("id", { count: "exact", head: true }).eq("respected_published_price", false),
  ])

  const { data: incidentSellers } = await admin
    .from("sellers")
    .select("id, name, price_integrity_level")
    .gt("price_integrity_level", 0)
    .order("price_integrity_level", { ascending: false })
    .limit(20)

  const { data: pendingReports } = await admin
    .from("product_reports")
    .select("id, details, created_at, listings(id, price, products(name), sellers(id, name))")
    .eq("reason", "MISLEADING_PRICE")
    .eq("status", "PENDING")
    .order("created_at", { ascending: false })
    .limit(30)

  const respectedCount = respected.count ?? 0
  const notRespectedCount = notRespected.count ?? 0
  const rated = respectedCount + notRespectedCount

  return NextResponse.json({
    metrics: {
      highRiskListings: highRisk.count ?? 0,
      warningListings: warningRisk.count ?? 0,
      confirmedAnyway: confirmedAnyway.count ?? 0,
      misleadingPending: misleadingPending.count ?? 0,
      misleadingConfirmed: misleadingConfirmed.count ?? 0,
      priceRespectRate: rated === 0 ? null : respectedCount / rated,
      ratedOperations: rated,
    },
    incidentSellers: incidentSellers ?? [],
    pendingReports: pendingReports ?? [],
  })
}
