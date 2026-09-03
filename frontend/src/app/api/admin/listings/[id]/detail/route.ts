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
      "id, price, stock, condition, status, featured_plan, image_url, created_at, updated_at, share_to_social, products(id, name, description, brand, images, category_id, categories(id, name, parent_id)), sellers(id, name), currencies(symbol, code)"
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

  const questionSelectFull =
    "id, question, answer, question_deleted, answer_deleted, hidden_by_seller, from_admin, created_at, updated_at, buyer:sellers!questions_buyer_id_fkey(id, name, email, phone, fantasma)"
  const questionSelectSafe =
    "id, question, answer, question_deleted, answer_deleted, hidden_by_seller, created_at, updated_at, buyer:sellers!questions_buyer_id_fkey(id, name, email, phone)"

  const [questionsReceived, reportsReceived, favoritesSaved, questionsList, ghosts] = await Promise.all([
    admin.from("questions").select("id", { count: "exact", head: true }).eq("listing_id", id),
    admin.from("product_reports").select("id", { count: "exact", head: true }).eq("listing_id", id),
    admin.from("favorites").select("id", { count: "exact", head: true }).eq("listing_id", id),
    admin.from("questions").select(questionSelectFull).eq("listing_id", id).order("created_at", { ascending: false }),
    admin.from("sellers").select("id, name").eq("fantasma", true).neq("id", listing.sellers?.id ?? "").order("name"),
  ])

  let questions = questionsList.data ?? []
  if (questionsList.error) {
    const fallback = await admin
      .from("questions")
      .select(questionSelectSafe)
      .eq("listing_id", id)
      .order("created_at", { ascending: false })
    questions = (fallback.data ?? []).map((row) => ({ ...row, from_admin: false }))
  }

  let ghostBuyers = ghosts.data ?? []
  if (ghosts.error && /fantasma/i.test(ghosts.error.message)) {
    ghostBuyers = []
  }

  return NextResponse.json({
    listing: { ...listing, sellerEmail },
    questions,
    ghostBuyers,
    stats: {
      questionsReceived: questionsReceived.count ?? 0,
      reportsReceived: reportsReceived.count ?? 0,
      favoritesSaved: favoritesSaved.count ?? 0,
    },
  })
}
