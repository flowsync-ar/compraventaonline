import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Public, unauthenticated — fired once per page load from SiteChrome (public
// site only, never /admin). Best-effort: a failure here must never break
// the page for a real visitor, so this always responds 200 regardless of
// whether the insert actually succeeded.
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

  try {
    const admin = createAdminClient()
    await admin.from("page_views").insert({ path })
  } catch (err) {
    console.error("[track-visit] Could not record page view:", err)
  }

  return NextResponse.json({ ok: true })
}
