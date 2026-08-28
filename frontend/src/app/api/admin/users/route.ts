import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("sellers")
    .select("id, user_id, name, type, phone, location, status, created_at, identity_verified")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Email lives in auth.users, not in `sellers` — only reachable via the
  // Admin API (not a regular PostgREST join, `auth` schema isn't exposed).
  const { data: authList, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailByUserId = new Map(authList?.users.map((u) => [u.id, u.email]) ?? [])
  if (authError) {
    console.warn("Could not load auth emails:", authError.message)
  }

  const users = data.map((seller) => ({
    ...seller,
    email: emailByUserId.get(seller.user_id) ?? null,
  }))

  return NextResponse.json({ users })
}
