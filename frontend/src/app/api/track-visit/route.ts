import { NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"

// Public, unauthenticated — fired once per page load from SiteChrome (public
// site only, never /admin). Best-effort: a failure here must never break
// the page for a real visitor, so this always responds 200 regardless of
// whether the insert actually succeeded.
//
// Deduped by (visitor_key, visit_date) — see 026_unique_page_views.sql —
// so the same visitor reloading or browsing multiple pages in one day
// only ever counts once, not once per page load.
//
// visitor_key used to be the client-supplied cvo_vid cookie, but a cookie
// resets every time (e.g. a new incognito window), so the same person
// could inflate the count arbitrarily. It's now derived server-side from
// the request's IP instead — can't be reset by the client, and hashing it
// (rather than storing the raw address) keeps it non-reversible at rest.
// Trade-off: visitors sharing an IP (office NAT, same household) collapse
// into one — accepted as the better failure mode vs. incognito inflation.
function getVisitorKey(request: NextRequest): string | null {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  if (!ip) return null
  return createHash("sha256").update(ip).digest("hex")
}

export async function POST(request: NextRequest) {
  let path = "/"
  try {
    const body = await request.json()
    if (typeof body?.path === "string" && body.path.length <= 500) {
      path = body.path
    }
  } catch {
    // no body / invalid JSON — track as "/" rather than reject the beacon
  }

  // No IP resolvable at all (unusual, but possible behind some proxies) —
  // nothing to dedupe against, so just skip rather than record an
  // uncounted visit.
  const visitorKey = getVisitorKey(request)
  if (!visitorKey) {
    return NextResponse.json({ ok: true })
  }

  try {
    const admin = createAdminClient()
    await admin
      .from("page_views")
      .upsert(
        { path, visitor_key: visitorKey },
        { onConflict: "visitor_key,visit_date", ignoreDuplicates: true }
      )
  } catch (err) {
    console.error("[track-visit] Could not record page view:", err)
  }

  return NextResponse.json({ ok: true })
}
