import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const [suggestions, support, reports] = await Promise.all([
    admin
      .from("category_suggestions")
      .select("id, suggested_name, created_at, sellers(name)")
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("support_messages")
      .select("id, name, email, message, created_at")
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("product_reports")
      .select("id, reason, created_at, listings(products(name))")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  const items: {
    id: string
    type: "category" | "support" | "report"
    title: string
    subtitle: string
    href: string
    created_at: string
  }[] = []

  for (const row of suggestions.data ?? []) {
    const seller = row.sellers as { name?: string } | null
    items.push({
      id: `category-${row.id}`,
      type: "category",
      title: `Proponen categoría “${row.suggested_name}”`,
      subtitle: seller?.name ? `Pedido por ${seller.name}` : "Pedido de categoría",
      href: "/admin/categorias",
      created_at: row.created_at,
    })
  }

  for (const row of support.data ?? []) {
    items.push({
      id: `support-${row.id}`,
      type: "support",
      title: `Consulta de ${row.name}`,
      subtitle: row.message.slice(0, 90),
      href: "/admin/consultas",
      created_at: row.created_at,
    })
  }

  for (const row of reports.data ?? []) {
    const listing = row.listings as { products?: { name?: string } | null } | null
    items.push({
      id: `report-${row.id}`,
      type: "report",
      title: "Reclamo sobre una publicación",
      subtitle: listing?.products?.name ?? row.reason,
      href: "/admin/reclamos",
      created_at: row.created_at,
    })
  }

  items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

  return NextResponse.json({
    items: items.slice(0, 30),
    counts: {
      category: suggestions.data?.length ?? 0,
      support: support.data?.length ?? 0,
      report: reports.data?.length ?? 0,
    },
  })
}
