import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

interface BulkUpdateBody {
  sellerId?: string
  listingIds?: string[]
  mode?: "PERCENT" | "FIXED"
  value?: number
}

// Applies one increase (percent or fixed amount) to a hand-picked subset of
// a comercio's listings — the admin tool for "el cliente pidió aumentar
// todo un X%". Each listing is updated individually (not a single SQL
// UPDATE ... WHERE id IN (...)) because PERCENT needs each listing's own
// current price to compute its new one, and every change gets logged to
// price_adjustments for traceability.
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: BulkUpdateBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const { sellerId, listingIds, mode, value } = body
  if (!sellerId || !listingIds || listingIds.length === 0) {
    return NextResponse.json({ error: "Faltan el comercio o las publicaciones a actualizar" }, { status: 400 })
  }
  if (mode !== "PERCENT" && mode !== "FIXED") {
    return NextResponse.json({ error: "Modo de aumento inválido" }, { status: 400 })
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value === 0) {
    return NextResponse.json({ error: "El valor del aumento debe ser un número distinto de 0" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: listings, error: listingsError } = await admin
    .from("listings")
    .select("id, price, seller_id")
    .in("id", listingIds)

  if (listingsError || !listings) {
    return NextResponse.json({ error: "No se pudieron cargar las publicaciones" }, { status: 500 })
  }

  const belongsToOtherSeller = listings.some((l) => l.seller_id !== sellerId)
  if (belongsToOtherSeller) {
    return NextResponse.json({ error: "Alguna publicación no pertenece a este comercio" }, { status: 400 })
  }

  const updates = listings.map((listing) => {
    const oldPrice = Number(listing.price)
    const newPrice = Math.max(
      0,
      Math.round(mode === "PERCENT" ? oldPrice * (1 + value / 100) : oldPrice + value),
    )
    return { id: listing.id, oldPrice, newPrice }
  })

  for (const update of updates) {
    const { error: updateError } = await admin
      .from("listings")
      .update({ price: update.newPrice })
      .eq("id", update.id)
    if (updateError) {
      console.error("[pricing/bulk-update] failed to update listing", update.id, updateError)
      continue
    }
    await admin.from("price_adjustments").insert({
      listing_id: update.id,
      seller_id: sellerId,
      mode,
      value,
      old_price: update.oldPrice,
      new_price: update.newPrice,
    })
  }

  return NextResponse.json({ updated: updates.length })
}
