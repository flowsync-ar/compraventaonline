import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Business sellers only — this tool is for "lista de precios" bulk
// increases, which only makes sense for a comercio with a real catalog,
// not an individual seller with one or two personal listings.
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("sellers")
    .select("id, name, location")
    .eq("type", "BUSINESS_SELLER")
    .order("name", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ sellers: data })
}
