import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSeller } from "@/lib/supabase/seller-guard"
import { createCheckoutPreference, checkoutUrl } from "@/lib/mercadopago/client"

const PURCHASABLE_STATUSES = ["APPROVED", "ACTIVE"]

// Starts a paid "Destacar publicación" purchase: a flat fee charged to the
// platform's own Mercado Pago account (not a connected seller's — this is a
// platform fee, not marketplace escrow between third parties), via Checkout
// Pro. The webhook at /api/webhooks/mercadopago-highlights confirms payment
// and actually applies the highlight.
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const seller = await requireSeller(supabase)
  if (!seller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
  if (!accessToken) {
    return NextResponse.json(
      { error: "El pago de destacados no está configurado en el servidor" },
      { status: 500 },
    )
  }

  let body: { listingId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }
  const { listingId } = body
  if (!listingId) {
    return NextResponse.json({ error: "Falta el ID de la publicación" }, { status: 400 })
  }

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, status, seller_id, products ( name )")
    .eq("id", listingId)
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 })
  }
  if (listing.seller_id !== seller.sellerId) {
    return NextResponse.json({ error: "Esta publicación no te pertenece" }, { status: 403 })
  }
  if (!PURCHASABLE_STATUSES.includes(listing.status)) {
    return NextResponse.json(
      { error: "Solo se pueden destacar publicaciones activas" },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  const { data: settings, error: settingsError } = await admin
    .from("platform_settings")
    .select("highlight_price, highlight_duration_days")
    .eq("id", true)
    .single()
  if (settingsError || !settings) {
    console.error("[highlights/checkout] failed to load settings", settingsError)
    return NextResponse.json({ error: "No se pudo iniciar la compra" }, { status: 500 })
  }

  const now = new Date().toISOString()
  const { data: activeHighlight } = await admin
    .from("highlighted_products")
    .select("end_date")
    .eq("listing_id", listingId)
    .gt("end_date", now)
    .maybeSingle()
  if (activeHighlight) {
    return NextResponse.json(
      { error: "Esta publicación ya está destacada" },
      { status: 400 },
    )
  }

  const { data: order, error: orderError } = await admin
    .from("highlight_orders")
    .insert({
      listing_id: listingId,
      seller_id: seller.sellerId,
      amount: settings.highlight_price,
      duration_days: settings.highlight_duration_days,
      status: "PENDING",
    })
    .select()
    .single()

  if (orderError || !order) {
    console.error("[highlights/checkout] failed to create order", orderError)
    return NextResponse.json({ error: "No se pudo iniciar la compra" }, { status: 500 })
  }

  const origin = request.nextUrl.origin
  const productName = (listing.products as { name?: string } | null)?.name ?? "tu publicación"

  try {
    const preference = await createCheckoutPreference({
      accessToken,
      title: `Destacar publicación: ${productName}`,
      amount: settings.highlight_price,
      externalReference: order.id,
      notificationUrl: `${origin}/api/webhooks/mercadopago-highlights`,
      backUrls: {
        success: `${origin}/dashboard?tab=inventory&highlight=success`,
        failure: `${origin}/dashboard?tab=inventory&highlight=failure`,
        pending: `${origin}/dashboard?tab=inventory&highlight=pending`,
      },
    })

    await admin
      .from("highlight_orders")
      .update({ mp_preference_id: preference.id })
      .eq("id", order.id)

    return NextResponse.json({ url: checkoutUrl(preference, accessToken) })
  } catch (err) {
    console.error("[highlights/checkout] failed to create MP preference", err)
    await admin.from("highlight_orders").delete().eq("id", order.id)
    return NextResponse.json({ error: "No se pudo iniciar el pago con Mercado Pago" }, { status: 502 })
  }
}
