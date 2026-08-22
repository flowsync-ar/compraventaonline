import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

// A comercio's catalog for the "Lista de Precios" bulk-adjustment tool.
// Excludes DELETED — nothing to reprice there. SOLD/PAUSED are included
// (unlike the "Destacar" purchasable-set filters elsewhere) since a price
// increase list from the owner isn't scoped to what's currently buyable.
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const sellerId = request.nextUrl.searchParams.get("sellerId")
  if (!sellerId) {
    return NextResponse.json({ error: "Falta el ID del comercio" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("listings")
    .select(
      "id, price, status, image_url, currency_id, products(name, images), currencies(symbol)"
    )
    .eq("seller_id", sellerId)
    .neq("status", "DELETED")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ listings: data })
}
