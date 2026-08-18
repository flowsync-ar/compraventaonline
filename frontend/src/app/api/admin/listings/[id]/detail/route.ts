import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params
  const admin = createAdminClient()

  const { data: listing, error } = await admin
    .from("listings")
    .select(
      "id, price, stock, condition, status, featured_plan, image_url, created_at, updated_at, products(name, description, brand, images, categories(name)), sellers(id, name), currencies(symbol, code)"
    )
    .eq("id", id)
    .single()

  if (error || !listing) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 })
  }

  let sellerEmail: string | null = null
  if (listing.sellers) {
    const { data: sellerRow } = await admin
      .from("sellers")
      .select("user_id")
      .eq("id", listing.sellers.id)
      .single()
    if (sellerRow) {
      const { data: authUser } = await admin.auth.admin.getUserById(sellerRow.user_id)
      sellerEmail = authUser?.user?.email ?? null
    }
  }

  const [questionsReceived, reportsReceived, favoritesSaved] = await Promise.all([
    admin.from("questions").select("id", { count: "exact", head: true }).eq("listing_id", id),
    admin.from("product_reports").select("id", { count: "exact", head: true }).eq("listing_id", id),
    admin.from("favorites").select("id", { count: "exact", head: true }).eq("listing_id", id),
  ])

  return NextResponse.json({
    listing: { ...listing, sellerEmail },
    stats: {
      questionsReceived: questionsReceived.count ?? 0,
      reportsReceived: reportsReceived.count ?? 0,
      favoritesSaved: favoritesSaved.count ?? 0,
    },
  })
}
