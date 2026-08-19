import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { requireSeller } from "@/lib/supabase/seller-guard"

const VALID_PLATFORMS = ["INSTAGRAM", "FACEBOOK", "TIKTOK"] as const
type Platform = (typeof VALID_PLATFORMS)[number]

// DELETE: disconnects one platform for the caller's own account.
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ platform: string }> }
) {
  const { platform: platformParam } = await context.params
  const platform = platformParam.toUpperCase() as Platform
  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "Plataforma inválida" }, { status: 400 })
  }

  const supabase = await createServerClient()
  const seller = await requireSeller(supabase)
  if (!seller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { error } = await supabase
    .from("seller_social_accounts")
    .delete()
    .eq("seller_id", seller.sellerId)
    .eq("platform", platform)

  if (error) {
    return NextResponse.json({ error: "No se pudo desvincular la cuenta" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
