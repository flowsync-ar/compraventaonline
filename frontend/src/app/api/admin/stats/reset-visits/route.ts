import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

// POST /api/admin/stats/reset-visits
// Wipes every row in page_views — an intentional, irreversible reset of
// the site-visit counter (e.g. after a burst of test traffic, or to
// start counting fresh from a known date). Does not touch listing_views
// or any other table.
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from("page_views").delete().not("id", "is", null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
