import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Storage health cross-referenced against our own catalog (which listing/
// seller owns each large file, which files are orphaned) — the exact slice
// Supabase's own dashboard can't show, since it has no idea what a
// "listing" is. Everything here comes from admin_get_storage_health()
// (migration 044), no new external credentials involved.
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc("admin_get_storage_health")

  if (error) {
    console.error("[api/admin/metrics/storage] rpc failed", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
