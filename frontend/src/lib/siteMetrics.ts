import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Json } from "@/lib/supabase/types"

type Admin = SupabaseClient<Database>

export type SiteMetricSnapshot = {
  capturedAt: string
  capturedAtArt: string
  timezone: "America/Argentina/Buenos_Aires"
  label: string | null
  catalog: {
    authUsers: number
    authUsersConfirmed: number
    sellers: number
    sellersByType: Record<string, number>
    sellersByStatus: Record<string, number>
    sellersIdentityVerified: number
    sellersLast7d: number
    sellersLast30d: number
    sellersTodayArt: number
    listings: number
    listingsByStatus: Record<string, number>
    listingsApproved: number
    listingsLast7d: number
    listingsLast30d: number
    questions: number
    favorites: number
    reports: number
    supportMessages: number
  }
  commerce: {
    orders: number
    ordersByStatus: Record<string, number>
    paidOrders: number
    paidRevenue: number
  }
  traffic: {
    uniquePageViews: number
    uniqueVisitors: number
    pageViewsLast7d: number
    pageViewsLast30d: number
    pageViewsTodayArt: number
    listingViews: number
    listingViewsTodayArt: number
    dailyUniqueVisitorsArt: { date: string; uniqueVisits: number }[]
    topPaths: { path: string; count: number }[]
  }
  infra: {
    storageBytes: number
    storageFiles: number
    storageByBucket: { bucket: string; files: number; bytes: number }[]
    orphanedFiles: number
    orphanedBytes: number
  }
}

function dayKeyArt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
}

function groupCount<T>(rows: T[], keyFn: (row: T) => string): Record<string, number> {
  const map: Record<string, number> = {}
  for (const row of rows) {
    const key = keyFn(row)
    map[key] = (map[key] ?? 0) + 1
  }
  return map
}

async function count(admin: Admin, table: keyof Database["public"]["Tables"]): Promise<number> {
  const { count: value, error } = await admin.from(table).select("id", { count: "exact", head: true })
  if (error) throw new Error(`${String(table)}: ${error.message}`)
  return value ?? 0
}

async function fetchAll<T>(
  admin: Admin,
  table: keyof Database["public"]["Tables"],
  columns: string,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin.from(table).select(columns).range(from, from + pageSize - 1)
    if (error) throw new Error(`${String(table)}: ${error.message}`)
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < pageSize) break
  }
  return rows
}

async function countAuthUsers(admin: Admin): Promise<{ total: number; confirmed: number }> {
  let total = 0
  let confirmed = 0
  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const users = data.users ?? []
    total += users.length
    confirmed += users.filter((u) => !!u.email_confirmed_at).length
    if (users.length < 1000) break
    page += 1
  }
  return { total, confirmed }
}

export async function captureSiteMetrics(admin: Admin, label: string | null = null): Promise<SiteMetricSnapshot> {
  const capturedAt = new Date()
  const capturedAtArt = capturedAt.toLocaleString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" })
  const now = capturedAt.getTime()
  const d7 = new Date(now - 7 * 86400000).toISOString()
  const d30 = new Date(now - 30 * 86400000).toISOString()
  const todayArt = dayKeyArt(capturedAt.toISOString())

  const [authUsers, sellers, listings, orders, pageViews, listingViews, questions, favorites, reports, supportMessages, storage] =
    await Promise.all([
      countAuthUsers(admin),
      fetchAll<{ type: string | null; status: string | null; created_at: string; identity_verified: boolean }>(
        admin,
        "sellers",
        "type, status, created_at, identity_verified"
      ),
      fetchAll<{ status: string; created_at: string }>(admin, "listings", "status, created_at"),
      fetchAll<{ status: string; amount: number | null }>(admin, "orders", "status, amount"),
      fetchAll<{ path: string; visit_date: string; created_at: string; visitor_key: string }>(
        admin,
        "page_views",
        "path, visit_date, created_at, visitor_key"
      ),
      fetchAll<{ viewed_date: string }>(admin, "listing_views", "viewed_date"),
      count(admin, "questions"),
      count(admin, "favorites"),
      count(admin, "product_reports"),
      count(admin, "support_messages"),
      admin.rpc("admin_get_storage_health"),
    ])

  const storagePayload = storage.data as {
    by_bucket?: { bucket_id: string; file_count: number; total_bytes: number }[]
    orphaned_count?: number
    orphaned_bytes?: number
  } | null
  const byBucket = storagePayload?.by_bucket ?? []

  return {
    capturedAt: capturedAt.toISOString(),
    capturedAtArt,
    timezone: "America/Argentina/Buenos_Aires",
    label,
    catalog: {
      authUsers: authUsers.total,
      authUsersConfirmed: authUsers.confirmed,
      sellers: sellers.length,
      sellersByType: groupCount(sellers, (s) => s.type || "unknown"),
      sellersByStatus: groupCount(sellers, (s) => s.status || "unknown"),
      sellersIdentityVerified: sellers.filter((s) => s.identity_verified).length,
      sellersLast7d: sellers.filter((s) => s.created_at >= d7).length,
      sellersLast30d: sellers.filter((s) => s.created_at >= d30).length,
      sellersTodayArt: sellers.filter((s) => dayKeyArt(s.created_at) === todayArt).length,
      listings: listings.length,
      listingsByStatus: groupCount(listings, (l) => l.status || "unknown"),
      listingsApproved: listings.filter((l) => l.status === "APPROVED").length,
      listingsLast7d: listings.filter((l) => l.created_at >= d7).length,
      listingsLast30d: listings.filter((l) => l.created_at >= d30).length,
      questions,
      favorites,
      reports,
      supportMessages,
    },
    commerce: {
      orders: orders.length,
      ordersByStatus: groupCount(orders, (o) => o.status || "unknown"),
      paidOrders: orders.filter((o) => o.status === "PAID").length,
      paidRevenue: orders.filter((o) => o.status === "PAID").reduce((sum, o) => sum + Number(o.amount || 0), 0),
    },
    traffic: {
      uniquePageViews: pageViews.length,
      uniqueVisitors: new Set(pageViews.map((v) => v.visitor_key)).size,
      pageViewsLast7d: pageViews.filter((v) => v.created_at >= d7).length,
      pageViewsLast30d: pageViews.filter((v) => v.created_at >= d30).length,
      pageViewsTodayArt: pageViews.filter((v) => (v.visit_date || dayKeyArt(v.created_at)) === todayArt).length,
      listingViews: listingViews.length,
      listingViewsTodayArt: listingViews.filter((v) => v.viewed_date === todayArt).length,
      dailyUniqueVisitorsArt: Object.entries(
        groupCount(pageViews, (v) => v.visit_date || dayKeyArt(v.created_at))
      )
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, uniqueVisits]) => ({ date, uniqueVisits })),
      topPaths: Object.entries(groupCount(pageViews, (v) => v.path || "/"))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([path, pathCount]) => ({ path, count: pathCount })),
    },
    infra: {
      storageBytes: byBucket.reduce((sum, b) => sum + (b.total_bytes ?? 0), 0),
      storageFiles: byBucket.reduce((sum, b) => sum + (b.file_count ?? 0), 0),
      storageByBucket: byBucket.map((b) => ({
        bucket: b.bucket_id,
        files: b.file_count,
        bytes: b.total_bytes,
      })),
      orphanedFiles: storagePayload?.orphaned_count ?? 0,
      orphanedBytes: storagePayload?.orphaned_bytes ?? 0,
    },
  }
}

export async function persistSiteMetrics(admin: Admin, snapshot: SiteMetricSnapshot) {
  const { error } = await admin.from("site_metric_snapshots").insert({
    captured_at: snapshot.capturedAt,
    captured_at_art: snapshot.capturedAtArt,
    label: snapshot.label,
    payload: snapshot as unknown as Json,
  })
  if (error) throw error
}
