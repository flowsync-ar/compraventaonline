import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { analyzePrice } from "@/lib/priceIntegrity/analyzePrice"
import {
  PRICE_INTEGRITY_EVENT,
  PRICE_RISK,
  type PriceIntegrityEventType,
} from "@/lib/priceIntegrity/types"

interface Body {
  listingId?: string
  eventType?: PriceIntegrityEventType
  confirmed?: boolean
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const listingId = body.listingId
  if (!listingId) {
    return NextResponse.json({ error: "Falta listingId" }, { status: 400 })
  }

  const { data: seller } = await supabase.from("sellers").select("id").eq("user_id", user.id).single()
  if (!seller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: listing } = await admin
    .from("listings")
    .select("id, seller_id, price")
    .eq("id", listingId)
    .single()

  if (!listing || listing.seller_id !== seller.id) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 })
  }

  const analysis = analyzePrice({ price: Number(listing.price) })
  const eventType: PriceIntegrityEventType =
    body.eventType ??
    (body.confirmed
      ? PRICE_INTEGRITY_EVENT.SELLER_CONFIRMED
      : analysis.risk === PRICE_RISK.HIGH
        ? PRICE_INTEGRITY_EVENT.HIGH_RISK_DETECTED
        : PRICE_INTEGRITY_EVENT.WARNING_SHOWN)

  await admin.from("price_integrity_events").insert({
    listing_id: listingId,
    seller_id: seller.id,
    event_type: eventType,
    risk: analysis.risk,
    reasons: analysis.reasons,
  })

  if (body.confirmed) {
    await admin.from("listings").update({ price_seller_confirmed: true }).eq("id", listingId)
  }

  return NextResponse.json({ ok: true, analysis })
}
