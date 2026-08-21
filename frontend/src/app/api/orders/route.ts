import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSeller } from "@/lib/supabase/seller-guard"

// Listings can be purchased once approved by the admin, or once an admin
// reactivates a previously-paused one — the admin "reactivate" action sets
// status back to ACTIVE, not APPROVED (see api/admin/listings/[id]/status).
const PURCHASABLE_STATUSES = ["APPROVED", "ACTIVE"]

type ListingStatus = "ACTIVE" | "APPROVED" | "PAUSED" | "SOLD" | "DELETED"

interface ListingForOrder {
  id: string
  price: number
  status: ListingStatus
  stock: number
  seller_id: string
  currency_id: string | null
}

// Creates an order recording the buyer's commitment to purchase — no
// payment gateway involved. Buyer and seller coordinate payment and
// delivery between themselves (see the "Compromiso de Compra" notice on
// the listing page). payment_method is hardcoded to TRANSFER: it's the
// closest existing semantic ("off-platform payment"), and it's what grants
// the seller RLS permission to self-confirm the order as PAID later (see
// "orders: seller can confirm transfer" policy in
// 007_orders_and_mercadopago.sql).
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const buyer = await requireSeller(supabase)
  if (!buyer) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: { listingId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const { listingId } = body
  if (!listingId) {
    return NextResponse.json({ error: "Faltan datos de la orden" }, { status: 400 })
  }

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, price, status, stock, seller_id, currency_id")
    .eq("id", listingId)
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 })
  }
  const typedListing = listing as unknown as ListingForOrder
  if (!PURCHASABLE_STATUSES.includes(typedListing.status)) {
    return NextResponse.json({ error: "Esta publicación no está disponible para compra" }, { status: 400 })
  }
  if (typedListing.stock <= 0) {
    return NextResponse.json({ error: "Sin stock disponible" }, { status: 400 })
  }
  if (typedListing.seller_id === buyer.sellerId) {
    return NextResponse.json({ error: "No podés comprar tu propia publicación" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      listing_id: typedListing.id,
      buyer_id: buyer.sellerId,
      seller_id: typedListing.seller_id,
      amount: typedListing.price,
      currency_id: typedListing.currency_id,
      payment_method: "TRANSFER",
      status: "PENDING",
    })
    .select()
    .single()

  if (orderError || !order) {
    console.error("[orders] failed to create order", orderError)
    return NextResponse.json({ error: "No se pudo crear la orden" }, { status: 500 })
  }

  // Reserve the stock now (at commitment, not at seller confirmation) so a
  // second buyer can't also commit to the same single-stock item while this
  // order is still PENDING. The `.eq("stock", typedListing.stock)` guard
  // makes this an optimistic-concurrency check: if someone else already
  // decremented it between our read above and this write, `count` comes
  // back 0 and we roll back the order instead of overselling.
  const newStock = typedListing.stock - 1
  const { error: stockError, count } = await admin
    .from("listings")
    .update(
      { stock: newStock, status: newStock <= 0 ? "SOLD" : typedListing.status },
      { count: "exact" },
    )
    .eq("id", typedListing.id)
    .eq("stock", typedListing.stock)

  if (stockError || !count) {
    await admin.from("orders").delete().eq("id", order.id)
    return NextResponse.json({ error: "Este producto ya no tiene stock disponible." }, { status: 409 })
  }

  return NextResponse.json({ order })
}
