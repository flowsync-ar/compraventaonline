import {
  MIN_OUTLIER_SAMPLE,
  PRICE_RISK,
  PRICE_RISK_REASON,
  type AnalyzePriceInput,
  type PriceIntegrityResult,
  type PriceRisk,
  type PriceRiskReason,
} from "./types"

function maxRisk(a: PriceRisk, b: PriceRisk): PriceRisk {
  const rank = { [PRICE_RISK.NORMAL]: 0, [PRICE_RISK.WARNING]: 1, [PRICE_RISK.HIGH]: 2 }
  return rank[a] >= rank[b] ? a : b
}

/**
 * Patterns that often signal bait pricing ($123, $999, $1111).
 * $99.999 (99999) is a common commercial price in ARS and is NOT flagged.
 */
export function isSuspiciousPricePattern(price: number): boolean {
  if (!Number.isFinite(price) || price <= 0) return false
  const int = Math.round(price)
  if (int === 123 || int === 1234 || int === 12345) return true
  const digits = String(int)
  if (digits.length >= 2 && digits.length <= 4 && /^(\d)\1+$/.test(digits)) return true
  return false
}

export function analyzePrice(input: AnalyzePriceInput): PriceIntegrityResult {
  const reasons: PriceRiskReason[] = []
  let risk: PriceRisk = PRICE_RISK.NORMAL
  const price = input.price

  if (!Number.isFinite(price) || price <= 0) {
    reasons.push(PRICE_RISK_REASON.SYMBOLIC_PRICE)
    risk = PRICE_RISK.HIGH
  } else if (price <= 100) {
    reasons.push(PRICE_RISK_REASON.SYMBOLIC_PRICE)
    risk = PRICE_RISK.HIGH
  } else if (price < 1000) {
    reasons.push(PRICE_RISK_REASON.EXTREMELY_LOW_PRICE)
    risk = maxRisk(risk, PRICE_RISK.WARNING)
  }

  if (price > 0 && isSuspiciousPricePattern(price)) {
    reasons.push(PRICE_RISK_REASON.SUSPICIOUS_PATTERN)
    risk = maxRisk(risk, PRICE_RISK.WARNING)
  }

  const stats = input.categoryStats
  if (stats && stats.sampleSize >= MIN_OUTLIER_SAMPLE && stats.median > 0 && Number.isFinite(price)) {
    if (price < stats.median * 0.05 || price > stats.median * 20) {
      reasons.push(PRICE_RISK_REASON.OUTLIER_PRICE)
      if (price < stats.median * 0.02 || price > stats.median * 50) {
        risk = PRICE_RISK.HIGH
      } else {
        risk = maxRisk(risk, PRICE_RISK.WARNING)
      }
    }
  }

  const requiresConfirmation = risk !== PRICE_RISK.NORMAL

  return { risk, reasons, requiresConfirmation }
}

export function formatListedPrice(price: number, symbol = "$"): string {
  if (!Number.isFinite(price)) return `${symbol} —`
  return `${symbol} ${Math.round(price).toLocaleString("es-AR")}`
}
