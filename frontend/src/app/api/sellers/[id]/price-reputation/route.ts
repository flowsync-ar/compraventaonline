import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { computePriceReputation } from "@/lib/priceIntegrity/reputation"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const admin = createAdminClient()

  const [{ count: respectedCount }, { count: notRespectedCount }] = await Promise.all([
    admin
      .from("seller_ratings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", id)
      .eq("respected_published_price", true),
    admin
      .from("seller_ratings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", id)
      .eq("respected_published_price", false),
  ])

  const reputation = computePriceReputation(respectedCount ?? 0, notRespectedCount ?? 0)
  return NextResponse.json({
    visible: reputation.visible,
    sampleSize: reputation.sampleSize,
    priceRespectRate: reputation.priceRespectRate,
    label: reputation.visible && reputation.priceRespectRate != null
      ? `${Math.round(reputation.priceRespectRate * 100)}% de operaciones con precio respetado`
      : null,
  })
}
