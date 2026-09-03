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

  const questionSelect =
    "id, question, answer, created_at, updated_at, from_admin, listing_id, buyer:sellers!questions_buyer_id_fkey(name), listing:listings!questions_listing_id_fkey(id, products(name))"
  const questionSelectFallback =
    "id, question, answer, created_at, updated_at, listing_id, buyer:sellers!questions_buyer_id_fkey(name), listing:listings!questions_listing_id_fkey(id, products(name))"

  const fetchAsked = () =>
    admin.from("questions").select(questionSelect).eq("buyer_id", id).order("created_at", { ascending: false })
  const fetchReceived = () =>
    listingIds.length > 0
      ? admin.from("questions").select(questionSelect).in("listing_id", listingIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[], error: null })

  const [reportsReceived, favoritesSaved, questionsAskedRows, questionsReceivedRows, paidOrders] = await Promise.all([
    listingIds.length > 0
      ? admin.from("product_reports").select("id", { count: "exact", head: true }).in("listing_id", listingIds)
      : Promise.resolve({ count: 0 }),
    admin.from("favorites").select("id", { count: "exact", head: true }).eq("seller_id", id),
    fetchAsked(),
    fetchReceived(),
    admin.from("orders").select("id", { count: "exact", head: true }).eq("seller_id", id).eq("status", "PAID"),
  ])

  let asked = questionsAskedRows.data ?? []
  if (questionsAskedRows.error && /from_admin/i.test(questionsAskedRows.error.message)) {
    const retry = await admin.from("questions").select(questionSelectFallback).eq("buyer_id", id).order("created_at", { ascending: false })
    asked = (retry.data ?? []).map((row) => ({ ...row, from_admin: false })) as typeof asked
  }

  let received = questionsReceivedRows.data ?? []
  if (questionsReceivedRows.error && /from_admin/i.test(questionsReceivedRows.error.message) && listingIds.length > 0) {
    const retry = await admin
      .from("questions")
      .select(questionSelectFallback)
      .in("listing_id", listingIds)
      .order("created_at", { ascending: false })
    received = (retry.data ?? []).map((row) => ({ ...row, from_admin: false })) as typeof received
  }

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
      questionsAsked: asked.length,
      questionsReceived: received.length,
    },
    listings: listingRows,
    questionsReceived: received,
    questionsAsked: asked,
  })
}
