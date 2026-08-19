import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    totalSellers,
    newSellers7d,
    newSellers30d,
    totalListings,
    activeListings,
    paidOrders,
    revenueRows,
    totalPageViews,
    pageViews7d,
    pageViews30d,
  ] = await Promise.all([
    admin.from("sellers").select("id", { count: "exact", head: true }),
    admin.from("sellers").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    admin.from("sellers").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    admin.from("listings").select("id", { count: "exact", head: true }),
    admin.from("listings").select("id", { count: "exact", head: true }).eq("status", "APPROVED"),
    admin.from("orders").select("id", { count: "exact", head: true }).eq("status", "PAID"),
    admin.from("orders").select("amount").eq("status", "PAID"),
    admin.from("page_views").select("id", { count: "exact", head: true }),
    admin.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    admin.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
  ])

  const revenueTotal = (revenueRows.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0)

  return NextResponse.json({
    sellers: {
      total: totalSellers.count ?? 0,
      last7Days: newSellers7d.count ?? 0,
      last30Days: newSellers30d.count ?? 0,
    },
    listings: {
      total: totalListings.count ?? 0,
      active: activeListings.count ?? 0,
    },
    orders: {
      paidCount: paidOrders.count ?? 0,
      revenueTotal,
    },
    pageViews: {
      total: totalPageViews.count ?? 0,
      last7Days: pageViews7d.count ?? 0,
      last30Days: pageViews30d.count ?? 0,
    },
  })
}
