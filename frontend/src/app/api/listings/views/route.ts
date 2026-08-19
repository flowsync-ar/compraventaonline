import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Returns { [listingId]: viewCount } for the caller's own listings only —
// GET /api/listings/views?ids=id1,id2,id3
//
// Each row in listing_views already represents one unique visitor on one
// day (deduped at insert time via the table's UNIQUE constraint), so the
// count here is simply "how many rows exist for this listing", no extra
// grouping logic needed on the read side.
export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids") ?? ""
  const requestedIds = idsParam.split(",").map((v) => v.trim()).filter(Boolean)

  if (requestedIds.length === 0) {
    return NextResponse.json({})
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: seller } = await admin
    .from("sellers")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!seller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Only count listings that actually belong to this seller — never trust
  // the ids in the query string on their own, a seller could otherwise
  // read view counts for someone else's listing by guessing its id.
  const { data: ownedListings } = await admin
    .from("listings")
    .select("id")
    .eq("seller_id", seller.id)
    .in("id", requestedIds)

  const ownedIds = (ownedListings ?? []).map((l) => l.id)
  if (ownedIds.length === 0) {
    return NextResponse.json({})
  }

  const { data: views, error } = await admin
    .from("listing_views")
    .select("listing_id")
    .in("listing_id", ownedIds)

  if (error) {
    console.error("[listings/views] Could not read view counts:", error)
    return NextResponse.json({ error: "No se pudieron obtener las visitas" }, { status: 500 })
  }

  const counts: Record<string, number> = {}
  for (const row of views ?? []) {
    counts[row.listing_id] = (counts[row.listing_id] ?? 0) + 1
  }

  return NextResponse.json(counts)
}
