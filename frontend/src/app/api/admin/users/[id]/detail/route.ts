import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params
  const admin = createAdminClient()

  const { data: seller, error: sellerError } = await admin
    .from("sellers")
    .select("*")
    .eq("id", id)
    .single()

  if (sellerError || !seller) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { data: authUser } = await admin.auth.admin.getUserById(seller.user_id)

  const { data: listings } = await admin
    .from("listings")
    .select("id, price, status, created_at, products(name)")
    .eq("seller_id", id)
    .order("created_at", { ascending: false })

  const listingRows = listings ?? []
  const listingIds = listingRows.map((l) => l.id)

  const counts = { active: 0, sold: 0, paused: 0, deleted: 0 }
  for (const l of listingRows) {
    if (l.status === "ACTIVE" || l.status === "APPROVED") counts.active++
    else if (l.status === "SOLD") counts.sold++
    else if (l.status === "PAUSED") counts.paused++
    else if (l.status === "DELETED") counts.deleted++
  }

  const [reportsReceived, favoritesSaved, questionsAsked, questionsReceived, paidOrders] = await Promise.all([
    listingIds.length > 0
      ? admin.from("product_reports").select("id", { count: "exact", head: true }).in("listing_id", listingIds)
      : Promise.resolve({ count: 0 }),
    admin.from("favorites").select("id", { count: "exact", head: true }).eq("seller_id", id),
    admin.from("questions").select("id", { count: "exact", head: true }).eq("buyer_id", id),
    listingIds.length > 0
      ? admin.from("questions").select("id", { count: "exact", head: true }).in("listing_id", listingIds)
      : Promise.resolve({ count: 0 }),
    // Whether this seller ever completed a sale — score/tier default to
    // 80/BRONCE at signup, which would otherwise read as a real reputation.
    admin.from("orders").select("id", { count: "exact", head: true }).eq("seller_id", id).eq("status", "PAID"),
  ])

  return NextResponse.json({
    user: { ...seller, email: authUser?.user?.email ?? null },
    hasSales: (paidOrders.count ?? 0) > 0,
    stats: {
      totalListings: listingRows.length,
      activeListings: counts.active,
      soldListings: counts.sold,
      pausedListings: counts.paused,
      deletedListings: counts.deleted,
      reportsReceived: reportsReceived.count ?? 0,
      favoritesSaved: favoritesSaved.count ?? 0,
      questionsAsked: questionsAsked.count ?? 0,
      questionsReceived: questionsReceived.count ?? 0,
    },
    listings: listingRows,
  })
}
