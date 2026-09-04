import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { listingImagesLimitMessage, remainingListingImageSlots } from "@/lib/listingImages"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params
  const form = await request.formData()
  const files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0)
  if (files.length === 0) {
    return NextResponse.json({ error: "No se recibieron fotos." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("id, seller_id, product_id, products(images)")
    .eq("id", id)
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 })
  }

  const currentImages = Array.isArray(listing.products)
    ? listing.products[0]?.images
    : listing.products?.images
  const current = Array.isArray(currentImages) ? currentImages.filter((u): u is string => typeof u === "string") : []
  const slots = remainingListingImageSlots(current.length)
  if (slots === 0) {
    return NextResponse.json({ error: listingImagesLimitMessage() }, { status: 400 })
  }
  const filesToUpload = files.slice(0, slots)

  const uploaded: string[] = []
  for (const file of filesToUpload) {
    const safeName = file.name.replace(/[^\w.-]+/g, "-") || "foto.webp"
    const path = `${listing.seller_id}/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`
    const { error: uploadError } = await admin.storage.from("listings").upload(path, file, {
      upsert: false,
      cacheControl: "31536000",
      contentType: file.type || "image/webp",
    })
    if (uploadError) {
      console.error("[admin listings images]", uploadError.message)
      return NextResponse.json({ error: "No se pudo subir una de las fotos." }, { status: 500 })
    }
    const { data: urlData } = admin.storage.from("listings").getPublicUrl(path)
    if (urlData?.publicUrl) uploaded.push(urlData.publicUrl)
  }

  const images = [...current, ...uploaded]
  const { error: productError } = await admin.from("products").update({ images }).eq("id", listing.product_id)
  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 400 })
  }
  const { error: coverError } = await admin
    .from("listings")
    .update({ image_url: images[0] ?? null })
    .eq("id", id)
  if (coverError) {
    return NextResponse.json({ error: coverError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, images, image_url: images[0] ?? null })
}
