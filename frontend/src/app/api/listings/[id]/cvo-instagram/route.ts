import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSeller } from "@/lib/supabase/seller-guard"
import { stripRichText } from "@/lib/richText"
import { composeInstagramDestacada } from "@/lib/instagramStory"

// POST /api/listings/[id]/cvo-instagram
// Builds a 9:16 story image (cover photo inside the CVO frame) and POSTs
// it to n8n together with listingUrl for the Instagram link sticker.

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: listingId } = await context.params
  const supabase = await createServerClient()
  const seller = await requireSeller(supabase)
  if (!seller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const webhookUrl = process.env.N8N_INSTAGRAM_WEBHOOK_URL?.trim()
  if (!webhookUrl) {
    console.warn("[cvo-instagram] N8N_INSTAGRAM_WEBHOOK_URL is not set")
    return NextResponse.json({ ok: true, skipped: true })
  }

  const admin = createAdminClient()
  const { data: listing, error } = await admin
    .from("listings")
    .select("id, seller_id, price, image_url, created_at, products ( name, description ), sellers ( name ), currencies ( symbol, code )")
    .eq("id", listingId)
    .single()

  if (error || !listing) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 })
  }
  if (listing.seller_id !== seller.sellerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const product = Array.isArray(listing.products) ? listing.products[0] : listing.products
  const sellerRow = Array.isArray(listing.sellers) ? listing.sellers[0] : listing.sellers
  const currency = Array.isArray(listing.currencies) ? listing.currencies[0] : listing.currencies
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.compraventaonline.com.ar").replace(/\/$/, "")
  const listingUrl = `${site}/listings/${listing.id}`
  const title = product?.name ?? ""
  const priceLabel = `${currency?.symbol ?? "$"}${Number(listing.price).toLocaleString("es-AR")}`

  let storyImageUrl: string | null = null
  if (listing.image_url) {
    try {
      const jpeg = await composeInstagramDestacada({
        coverImageUrl: listing.image_url,
        title,
        priceLabel,
      })
      const storagePath = `cvo-instagram/${listing.id}.jpg`
      const { error: uploadError } = await admin.storage
        .from("listings")
        .upload(storagePath, jpeg, { contentType: "image/jpeg", upsert: true })
      if (uploadError) throw uploadError
      storyImageUrl = admin.storage.from("listings").getPublicUrl(storagePath).data.publicUrl
    } catch (err) {
      console.error("[cvo-instagram] could not compose story image", err)
    }
  }

  const payload = {
    event: "listing.share_cvo_instagram",
    listingId: listing.id,
    listingUrl,
    storyLink: listingUrl,
    title,
    description: product?.description ? stripRichText(product.description) : "",
    coverImageUrl: listing.image_url,
    storyImageUrl,
    price: listing.price,
    currencySymbol: currency?.symbol ?? "$",
    currencyCode: currency?.code ?? "ARS",
    sellerName: sellerRow?.name ?? "",
    createdAt: listing.created_at,
  }

  const secret = process.env.N8N_WEBHOOK_SECRET?.trim()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (secret) headers["x-webhook-secret"] = secret

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error("[cvo-instagram] n8n webhook failed", res.status, body)
      return NextResponse.json({ error: "No se pudo avisar a redes" }, { status: 502 })
    }
  } catch (err) {
    console.error("[cvo-instagram] n8n webhook error", err)
    return NextResponse.json({ error: "No se pudo avisar a redes" }, { status: 502 })
  }

  await admin.from("listings").update({ share_to_social: ["INSTAGRAM"] }).eq("id", listingId)

  return NextResponse.json({ ok: true, listingUrl, storyImageUrl })
}
