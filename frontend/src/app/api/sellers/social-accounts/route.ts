import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { requireSeller } from "@/lib/supabase/seller-guard"

const VALID_PLATFORMS = ["INSTAGRAM", "FACEBOOK", "TIKTOK"] as const
type Platform = (typeof VALID_PLATFORMS)[number]

// GET: lists the caller's own connected social accounts.
export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const seller = await requireSeller(supabase)
  if (!seller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("seller_social_accounts")
    .select("id, platform, handle, connected_at")
    .eq("seller_id", seller.sellerId)

  if (error) {
    return NextResponse.json({ error: "No se pudieron cargar las redes sociales" }, { status: 500 })
  }

  return NextResponse.json({ accounts: data ?? [] })
}

// POST: connects (or updates the handle for) a platform.
//
// This is NOT real OAuth — see 020_social_accounts.sql. Posting on a
// seller's behalf requires a Meta/TikTok developer app approved for
// content-publishing permissions, which is an external, days-long process
// this endpoint can't shortcut. Until that's in place, "connecting" just
// records the handle the seller wants associated with their shares, so the
// share-assets flow (watermarked image + caption) has somewhere to point.
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const seller = await requireSeller(supabase)
  if (!seller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: { platform?: string; handle?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  const platform = body.platform as Platform | undefined
  const handle = body.handle?.trim().replace(/^@/, "")

  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "Plataforma inválida" }, { status: 400 })
  }
  if (!handle) {
    return NextResponse.json({ error: "Ingresá tu usuario/handle" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("seller_social_accounts")
    .upsert(
      { seller_id: seller.sellerId, platform, handle, connected_at: new Date().toISOString() },
      { onConflict: "seller_id,platform" }
    )
    .select("id, platform, handle, connected_at")
    .single()

  if (error) {
    return NextResponse.json({ error: "No se pudo vincular la cuenta" }, { status: 500 })
  }

  return NextResponse.json({ account: data })
}
