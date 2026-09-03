import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendQuestionEmailToSeller } from "@/lib/mail"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id: listingId } = await context.params
  let body: { question?: string; buyerId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const question = body.question?.trim() ?? ""
  const buyerId = body.buyerId?.trim() ?? ""
  if (question.length < 4) {
    return NextResponse.json({ error: "Escribí la pregunta (mínimo 4 caracteres)." }, { status: 400 })
  }
  if (!buyerId) {
    return NextResponse.json({ error: "Elegí una cuenta fantasma." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("id, seller_id, products(name)")
    .eq("id", listingId)
    .single()
  if (listingError || !listing) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 })
  }

  const { data: buyer, error: buyerError } = await admin
    .from("sellers")
    .select("id, name, fantasma")
    .eq("id", buyerId)
    .maybeSingle()
  if (buyerError || !buyer) {
    return NextResponse.json({ error: "Cuenta fantasma no encontrada." }, { status: 404 })
  }
  if (!buyer.fantasma) {
    return NextResponse.json({ error: "Solo se puede preguntar con una cuenta marcada como fantasma." }, { status: 400 })
  }
  if (buyer.id === listing.seller_id) {
    return NextResponse.json({ error: "La cuenta fantasma no puede ser el dueño del aviso." }, { status: 400 })
  }

  const insert = {
    listing_id: listingId,
    buyer_id: buyer.id,
    question,
    status: "PENDING" as const,
    from_admin: true,
  }

  let { data: row, error: insertError } = await admin
    .from("questions")
    .insert(insert)
    .select(
      "id, question, answer, question_deleted, answer_deleted, hidden_by_seller, from_admin, created_at, updated_at, buyer:sellers!questions_buyer_id_fkey(name, fantasma)",
    )
    .single()

  if (insertError && /from_admin/i.test(insertError.message)) {
    const retry = await admin
      .from("questions")
      .insert({ listing_id: listingId, buyer_id: buyer.id, question, status: "PENDING" })
      .select(
        "id, question, answer, question_deleted, answer_deleted, hidden_by_seller, created_at, updated_at, buyer:sellers!questions_buyer_id_fkey(name, fantasma)",
      )
      .single()
    row = retry.data ? { ...retry.data, from_admin: true } : null
    insertError = retry.error
  }

  if (insertError || !row) {
    return NextResponse.json({ error: insertError?.message ?? "No se pudo enviar la pregunta." }, { status: 400 })
  }

  const { data: seller } = await admin.from("sellers").select("name, email").eq("id", listing.seller_id).single()
  const product = Array.isArray(listing.products) ? listing.products[0] : listing.products
  if (seller?.email) {
    await sendQuestionEmailToSeller({
      to: seller.email,
      sellerName: seller.name ?? "",
      buyerName: buyer.name ?? "",
      productName: product?.name ?? "",
      question,
      listingUrl: `${request.nextUrl.origin}/listings/${listingId}`,
      logoUrl: `${request.nextUrl.origin}/logo-cvo-new.png`,
    }).catch(() => null)
  }

  return NextResponse.json({ question: row })
}
