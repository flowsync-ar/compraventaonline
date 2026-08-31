import { MIN_PUBLIC_PRICE_RESPECT_RATINGS, type PriceReputation } from "./types"

export function computePriceReputation(respectedCount: number, notRespectedCount: number): PriceReputation {
  const sampleSize = respectedCount + notRespectedCount
  const visible = sampleSize >= MIN_PUBLIC_PRICE_RESPECT_RATINGS
  const priceRespectRate = sampleSize === 0 ? null : respectedCount / sampleSize
  return {
    respectedCount,
    notRespectedCount,
    sampleSize,
    priceRespectRate,
    visible,
  }
}

export function formatPriceRespectLabel(reputation: PriceReputation): string | null {
  if (!reputation.visible || reputation.priceRespectRate == null) return null
  const pct = Math.round(reputation.priceRespectRate * 100)
  return `${pct}% de operaciones con precio respetado`
}
