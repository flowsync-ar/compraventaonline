import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Public, read-only: whether a seller has at least one PAID order.
// Used by public listing pages to avoid showing the sellers.score/tier DB
// defaults (80/BRONCE) as if they were an earned reputation for sellers who
// never actually sold anything.
//
// Needs the admin client — `orders` RLS only lets the buyer/seller read
// their own rows, but any visitor browsing a listing must be able to see
// whether that seller has sales at all.
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const admin = createAdminClient()

  const { count, error } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", id)
    .eq("status", "PAID")

  if (error) {
    return NextResponse.json({ error: "No se pudo verificar el estado del vendedor" }, { status: 500 })
  }

  return NextResponse.json({ hasSales: (count ?? 0) > 0 })
}
