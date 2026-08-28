import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSeller } from "@/lib/supabase/seller-guard"
import { sendQuestionEmailToSeller, sendAnswerEmailToBuyer } from "@/lib/mail"

type NotifyEvent = "asked" | "answered"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  let body: { event?: NotifyEvent }
  try {
    body = (await request.json()) as { event?: NotifyEvent }
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const { event } = body
  if (event !== "asked" && event !== "answered") {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 })
  }

  const supabase = await createServerClient()
  const requester = await requireSeller(supabase)
  if (!requester) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: question, error: questionError } = await admin
    .from("questions")
    .select("id, question, answer, status, buyer_id, listing_id")
    .eq("id", id)
    .maybeSingle()

  if (questionError || !question) {
    return NextResponse.json({ error: "Consulta no encontrada" }, { status: 404 })
  }

  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("id, seller_id, products(name)")
    .eq("id", question.listing_id)
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 })
  }

  if (event === "asked" && requester.sellerId !== question.buyer_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  if (event === "answered" && requester.sellerId !== listing.seller_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const productName = listing.products?.name ?? ""
  const listingUrl = `${request.nextUrl.origin}/listings/${listing.id}`
  const logoUrl = `${request.nextUrl.origin}/logo-cvo-new.png`

  if (event === "asked") {
    const [{ data: seller }, { data: buyer }] = await Promise.all([
      admin.from("sellers").select("name, email").eq("id", listing.seller_id).single(),
      admin.from("sellers").select("name").eq("id", question.buyer_id).single(),
    ])

    if (!seller?.email) {
      return NextResponse.json({ sent: false })
    }

    const result = await sendQuestionEmailToSeller({
      to: seller.email,
      sellerName: seller.name ?? "",
      buyerName: buyer?.name ?? "",
      productName,
      question: question.question,
      listingUrl,
      logoUrl,
    })

    return NextResponse.json(result)
  }

  if (!question.answer) {
    return NextResponse.json({ sent: false })
  }

  const [{ data: buyer }, { data: seller }] = await Promise.all([
    admin.from("sellers").select("name, email").eq("id", question.buyer_id).single(),
    admin.from("sellers").select("name").eq("id", listing.seller_id).single(),
  ])

  if (!buyer?.email) {
    return NextResponse.json({ sent: false })
  }

  const result = await sendAnswerEmailToBuyer({
    to: buyer.email,
    buyerName: buyer.name ?? "",
    sellerName: seller?.name ?? "",
    productName,
    question: question.question,
    answer: question.answer,
    listingUrl,
    logoUrl,
  })

  return NextResponse.json(result)
}
