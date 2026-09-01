// Snapshot of marketplace + infra load. Writes JSON to stdout (and optionally a file).
// Usage from frontend/: node --env-file=.env.local scripts/capture-site-metrics.mjs

import { createClient } from "@supabase/supabase-js"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

const capturedAt = new Date()
const capturedAtArt = capturedAt.toLocaleString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" })

async function count(table, apply = (q) => q) {
  const { count, error } = await apply(admin.from(table).select("id", { count: "exact", head: true }))
  if (error) throw new Error(`${table}: ${error.message}`)
  return count ?? 0
}

async function fetchAll(table, columns, pageSize = 1000) {
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin.from(table).select(columns).range(from, from + pageSize - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < pageSize) break
  }
  return rows
}

function groupCount(rows, keyFn) {
  const map = {}
  for (const row of rows) {
    const key = keyFn(row)
    map[key] = (map[key] ?? 0) + 1
  }
  return map
}

function dayKeyArt(iso) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
}

async function countAuthUsers() {
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

async function umamiRange(startAt, endAt) {
  const apiKey = process.env.UMAMI_API_KEY?.trim()
  const websiteId = "f7038b2c-d579-41cc-9a2f-7fad22cde88d"
  if (!apiKey) return null
  const url = new URL(`https://api.umami.is/v1/websites/${websiteId}/stats`)
  url.searchParams.set("startAt", String(startAt))
  url.searchParams.set("endAt", String(endAt))
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" } })
  if (!res.ok) return { error: `HTTP ${res.status}` }
  return res.json()
}

const [
  authUsers,
  sellers,
  listings,
  orders,
  pageViews,
  listingViews,
  questions,
  favorites,
  reports,
  supportMessages,
  storage,
] = await Promise.all([
  countAuthUsers(),
  fetchAll("sellers", "id, type, status, created_at, identity_verified, username"),
  fetchAll("listings", "id, status, featured_plan, created_at, price"),
  fetchAll("orders", "id, status, amount, created_at"),
  fetchAll("page_views", "id, path, visit_date, created_at, visitor_key"),
  fetchAll("listing_views", "id, viewed_date, listing_id"),
  count("questions"),
  count("favorites").catch(() => count("listing_favorites").catch(() => -1)),
  count("product_reports").catch(() => 0),
  count("support_messages").catch(() => 0),
  admin.rpc("admin_get_storage_health"),
])

const now = capturedAt.getTime()
const d7 = new Date(now - 7 * 86400000).toISOString()
const d30 = new Date(now - 30 * 86400000).toISOString()
const todayArt = dayKeyArt(capturedAt.toISOString())

const snapshot = {
  label: "baseline-campana-lanzamiento",
  capturedAt: capturedAt.toISOString(),
  capturedAtArt,
  timezone: "America/Argentina/Buenos_Aires",
  note: "Corte de referencia al arrancar la publicidad (31 ago 2026 ~20:55 ART).",
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
    listingsByFeatured: groupCount(listings, (l) => l.featured_plan || "none"),
    listingsLast7d: listings.filter((l) => l.created_at >= d7).length,
    listingsLast30d: listings.filter((l) => l.created_at >= d30).length,
    questions,
    favorites: favorites < 0 ? null : favorites,
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
      .map(([date, count]) => ({ date, uniqueVisits: count })),
    topPaths: Object.entries(groupCount(pageViews, (v) => v.path || "/"))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([path, count]) => ({ path, count })),
  },
  infra: {
    storage: storage.error ? { error: storage.error.message } : storage.data,
    supabaseProject: "uasifhyzuwjishzohcwo",
    hosting: "Vercel + Supabase + Umami Cloud",
  },
  umami: {
    last24h: await umamiRange(now - 86400000, now),
    last7d: await umamiRange(now - 7 * 86400000, now),
    last30d: await umamiRange(now - 30 * 86400000, now),
  },
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "metric-snapshots")
mkdirSync(outDir, { recursive: true })
const stamp = capturedAtArt.replace(/[: ]/g, "-")
const outFile = join(outDir, `${stamp}.json`)
writeFileSync(outFile, JSON.stringify(snapshot, null, 2))
writeFileSync(join(outDir, "latest.json"), JSON.stringify(snapshot, null, 2))
console.log(JSON.stringify({ wrote: outFile, capturedAtArt, catalog: snapshot.catalog, traffic: {
  uniquePageViews: snapshot.traffic.uniquePageViews,
  uniqueVisitors: snapshot.traffic.uniqueVisitors,
  pageViewsTodayArt: snapshot.traffic.pageViewsTodayArt,
}, commerce: snapshot.commerce, umamiConfigured: snapshot.umami.last7d != null }, null, 2))
