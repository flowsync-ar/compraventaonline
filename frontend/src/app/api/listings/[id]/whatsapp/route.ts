import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

function whatsappNumber(raw: string | null | undefined): string | null {
  const digits = raw?.replace(/\D/g, "") ?? ""
  if (digits.length < 8) return null
  if (digits.startsWith("549")) return digits
  return `549${digits.replace(/^54/, "")}`
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("listings")
    .select("id, status, products(name), sellers(phone)")
    .eq("id", id)
    .single()

  if (error || !data) {
    return NextResponse.json({ url: null }, { status: 404 })
  }

  const seller = Array.isArray(data.sellers) ? data.sellers[0] : data.sellers
  const product = Array.isArray(data.products) ? data.products[0] : data.products
  const number = whatsappNumber(seller?.phone)
  if (!number) {
    return NextResponse.json({ url: null })
  }

  const title = product?.name?.trim() || "esta publicación"
  const text = `Te contacto desde CompraVentaOnline y me interesa esta publicación: ${title}`
  return NextResponse.json({
    url: `https://wa.me/${number}?text=${encodeURIComponent(text)}`,
  })
}
