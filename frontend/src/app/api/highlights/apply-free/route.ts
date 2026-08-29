import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSeller } from "@/lib/supabase/seller-guard"
import { canFeatureForFree } from "@/lib/freeHighlight"

const ACTIVE_STATUSES = ["APPROVED", "ACTIVE"]

// Complimentary FEATURED for the two platform accounts. Everyone else
// pays via /api/highlights/checkout.
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const seller = await requireSeller(supabase)
  if (!seller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (!canFeatureForFree(seller.userEmail)) {
    return NextResponse.json({ error: "Este destacado es de pago" }, { status: 403 })
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
    .select("id, status, seller_id, featured_plan")
    .eq("id", listingId)
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 })
  }
  if (listing.seller_id !== seller.sellerId) {
    return NextResponse.json({ error: "Esta publicación no te pertenece" }, { status: 403 })
  }
  if (!ACTIVE_STATUSES.includes(listing.status)) {
    return NextResponse.json(
      { error: "Solo se pueden destacar publicaciones activas" },
      { status: 400 },
    )
  }
  if (listing.featured_plan === "FEATURED" || listing.featured_plan === "PREMIUM") {
    return NextResponse.json({ ok: true, already: true })
  }

  const admin = createAdminClient()
  const { error: updateError } = await admin
    .from("listings")
    .update({ featured_plan: "FEATURED" })
    .eq("id", listingId)

  if (updateError) {
    console.error("[highlights/apply-free] update failed", updateError)
    return NextResponse.json({ error: "No se pudo destacar la publicación" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
