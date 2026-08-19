import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSeller } from "@/lib/supabase/seller-guard"
import { getSellerMercadoPagoAccessToken } from "@/lib/mercadopago/tokens"
import { checkoutUrl, createCheckoutPreference } from "@/lib/mercadopago/client"

// Listings can be purchased once approved by the admin, or once an admin
// reactivates a previously-paused one — the admin "reactivate" action sets
// status back to ACTIVE, not APPROVED (see api/admin/listings/[id]/status).
const PURCHASABLE_STATUSES = ["APPROVED", "ACTIVE"]

interface ListingForOrder {
  id: string
  price: number
  status: string
  stock: number
  seller_id: string
  currency_id: string | null
  sellers: {
    id: string
    name: string
    mercadopago_connected: boolean
    bank_cbu: string | null
    bank_alias: string | null
  } | null
  products: { name: string } | null
  currencies: { code: string } | null
}

// Creates an order for a listing purchase.
// - MERCADOPAGO: also creates a Checkout Pro preference under the seller's
//   own MP account and returns the URL to redirect the buyer to.
// - TRANSFER: returns the order plus the seller's bank details so the
//   buyer can transfer manually.
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const buyer = await requireSeller(supabase)
  if (!buyer) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: { listingId?: string; paymentMethod?: "MERCADOPAGO" | "TRANSFER" }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const { listingId, paymentMethod } = body
  if (!listingId || (paymentMethod !== "MERCADOPAGO" && paymentMethod !== "TRANSFER")) {
    return NextResponse.json({ error: "Faltan datos de la orden" }, { status: 400 })
  }

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select(
      "id, price, status, stock, seller_id, currency_id, sellers(id, name, mercadopago_connected, bank_cbu, bank_alias), products(name), currencies(code)",
    )
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

  const seller = typedListing.sellers
  if (!seller) {
    return NextResponse.json({ error: "Vendedor no encontrado" }, { status: 404 })
  }

  if (paymentMethod === "MERCADOPAGO" && !seller.mercadopago_connected) {
    return NextResponse.json(
      { error: "El vendedor no tiene Mercado Pago vinculado. Elegí transferencia bancaria." },
      { status: 400 },
    )
  }
  if (paymentMethod === "TRANSFER" && !seller.bank_cbu && !seller.bank_alias) {
    return NextResponse.json(
      { error: "El vendedor no cargó datos bancarios para transferencia." },
      { status: 400 },
    )
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
      payment_method: paymentMethod,
      status: "PENDING",
    })
    .select()
    .single()

  if (orderError || !order) {
    console.error("[orders] failed to create order", orderError)
    return NextResponse.json({ error: "No se pudo crear la orden" }, { status: 500 })
  }

  if (paymentMethod === "TRANSFER") {
    return NextResponse.json({
      order,
      bank: { cbu: seller.bank_cbu, alias: seller.bank_alias, sellerName: seller.name },
    })
  }

  // MERCADOPAGO: create the Checkout Pro preference under the seller's account.
  const accessToken = await getSellerMercadoPagoAccessToken(typedListing.seller_id)
  if (!accessToken) {
    return NextResponse.json(
      { error: "El vendedor no tiene Mercado Pago vinculado. Elegí transferencia bancaria." },
      { status: 400 },
    )
  }

  const origin = request.nextUrl.origin
  try {
    const pref = await createCheckoutPreference({
      accessToken,
      title: typedListing.products?.name ?? "Publicación en CompraVentaOnline",
      amount: Number(typedListing.price),
      currency: typedListing.currencies?.code,
      externalReference: order.id,
      payerEmail: buyer.userEmail ?? undefined,
      notificationUrl: `${origin}/api/webhooks/mercadopago`,
      backUrls: {
        success: `${origin}/listings/${typedListing.id}?order=${order.id}&mp_status=success`,
        failure: `${origin}/listings/${typedListing.id}?order=${order.id}&mp_status=failure`,
        pending: `${origin}/listings/${typedListing.id}?order=${order.id}&mp_status=pending`,
      },
    })

    await admin.from("orders").update({ mp_preference_id: pref.id }).eq("id", order.id)

    return NextResponse.json({ order, checkoutUrl: checkoutUrl(pref, accessToken) })
  } catch (err) {
    console.error("[orders] failed to create MP preference", err)
    await admin.from("orders").update({ status: "CANCELLED" }).eq("id", order.id)
    return NextResponse.json({ error: "No se pudo iniciar el pago con Mercado Pago" }, { status: 502 })
  }
}
