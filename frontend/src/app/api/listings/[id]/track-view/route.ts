import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Public, best-effort — fired once per listing-detail page load. Dedup by
// (listing_id, viewer_key, day) happens at the DB level (see migration
// 018_listing_views.sql): upsert + ignoreDuplicates turns a same-day repeat
// visit into a silent no-op instead of counting it again. A failure here
// must never break the page for a real visitor, so this always responds
// 200 regardless of whether the insert actually landed.
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: listingId } = await context.params

  let anonVisitorId = ""
  try {
    const body = await request.json()
    if (typeof body?.visitorId === "string" && body.visitorId.length <= 100) {
      anonVisitorId = body.visitorId
    }
  } catch {
    // no body / invalid JSON — falls through, treated as "no anon id"
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const admin = createAdminClient()
    let viewerKey = anonVisitorId
    let viewingOwnListing = false

    if (user) {
      const { data: seller } = await admin
        .from("sellers")
        .select("id")
        .eq("user_id", user.id)
        .single()

      // Logged-in visitors are identified by their seller id (stable across
      // devices) instead of the anon cookie, so the same person browsing
      // from phone and laptop still dedupes to one visitor.
      if (seller) {
        viewerKey = seller.id

        const { data: listing } = await admin
          .from("listings")
          .select("seller_id")
          .eq("id", listingId)
          .single()

        viewingOwnListing = listing?.seller_id === seller.id
      }
    }

    // No usable identity at all (anon cookie never arrived) or the seller
    // checking their own listing: don't count it as a view.
    if (viewerKey && !viewingOwnListing) {
      await admin
        .from("listing_views")
        .upsert(
          { listing_id: listingId, viewer_key: viewerKey },
          { onConflict: "listing_id,viewer_key,viewed_date", ignoreDuplicates: true }
        )
    }
  } catch (err) {
    console.error("[track-view] Could not record listing view:", err)
  }

  return NextResponse.json({ ok: true })
}
