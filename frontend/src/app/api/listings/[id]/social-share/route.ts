import { NextRequest, NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSeller } from "@/lib/supabase/seller-guard"
import { stripRichText } from "@/lib/richText"

const VALID_PLATFORMS = ["INSTAGRAM", "FACEBOOK", "TIKTOK"] as const
type Platform = (typeof VALID_PLATFORMS)[number]

// Pure image compositing — no external API involved, so this works today
// regardless of whether any OAuth app is approved (see
// 020_social_accounts.sql). Stamps our icon logo in a bottom-right corner
// badge over the listing's cover photo, sized relative to the photo so it
// reads clearly without swallowing the product itself.
async function watermarkCoverImage(imageUrl: string): Promise<Buffer> {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`No se pudo descargar la foto de portada (${res.status})`)
  const coverBuffer = Buffer.from(await res.arrayBuffer())

  const cover = sharp(coverBuffer).rotate() // rotate() auto-applies EXIF orientation
  const { width = 1080, height = 1080 } = await cover.metadata()

  const badgeSize = Math.round(Math.min(width, height) * 0.18)
  const margin = Math.round(badgeSize * 0.35)

  const logoPath = path.join(process.cwd(), "public", "logo-cvo.png")
  const logoBuffer = await readFile(logoPath)
  const logo = await sharp(logoBuffer)
    .resize(badgeSize, badgeSize, { fit: "contain" })
    .toBuffer()

  return cover
    .composite([
      {
        input: logo,
        left: Math.max(0, width - badgeSize - margin),
        top: Math.max(0, height - badgeSize - margin),
      },
    ])
    .png()
    .toBuffer()
}

function buildCaption(params: {
  origin: string
  listingId: string
  productName: string
  description: string | null
}): string {
  const link = `${params.origin}/listings/${params.listingId}`
  const desc = params.description?.trim()
  return [
    params.productName,
    desc ? `\n${desc}` : null,
    `\n📍 Mirá el detalle y comprá acá: ${link}`,
    `\n#CompraVentaOnline #LaPampa`,
  ]
    .filter(Boolean)
    .join("\n")
}

// ============================================================
// POST /api/listings/[id]/social-share
// Body: { platforms: ("INSTAGRAM"|"FACEBOOK"|"TIKTOK")[] }
//
// Records which platforms the seller authorized sharing to (for when real
// auto-posting exists later) and returns a ready-to-use watermarked cover
// image (data URL) + caption text for the seller to paste in manually —
// see the module comment in 020_social_accounts.sql for why this isn't a
// real auto-post yet.
// ============================================================
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: listingId } = await context.params
  const supabase = await createServerClient()
  const seller = await requireSeller(supabase)
  if (!seller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let platforms: Platform[]
  try {
    const body = await request.json()
    platforms = Array.isArray(body?.platforms)
      ? body.platforms.filter((p: unknown): p is Platform => VALID_PLATFORMS.includes(p as Platform))
      : []
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  if (platforms.length === 0) {
    return NextResponse.json({ error: "Elegí al menos una red social" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("id, seller_id, image_url, products ( name, description )")
    .eq("id", listingId)
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 })
  }
  if (listing.seller_id !== seller.sellerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  if (!listing.image_url) {
    return NextResponse.json({ error: "Esta publicación no tiene foto de portada" }, { status: 400 })
  }

  let watermarked: Buffer
  try {
    watermarked = await watermarkCoverImage(listing.image_url)
  } catch (err) {
    console.error("[social-share] watermark failed:", err)
    return NextResponse.json({ error: "No se pudo generar la imagen para compartir" }, { status: 500 })
  }

  const { error: updateError } = await admin
    .from("listings")
    .update({ share_to_social: platforms })
    .eq("id", listingId)
  if (updateError) {
    console.error("[social-share] could not save share_to_social:", updateError.message)
    // Non-fatal — the seller still gets their image + caption.
  }

  const product = Array.isArray(listing.products) ? listing.products[0] : listing.products
  const caption = buildCaption({
    origin: request.nextUrl.origin,
    listingId,
    productName: product?.name ?? "Mi publicación",
    description: product?.description ? stripRichText(product.description) : null,
  })

  return NextResponse.json({
    imageDataUrl: `data:image/png;base64,${watermarked.toString("base64")}`,
    caption,
  })
}
