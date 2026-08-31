export const PRICE_RISK = {
  NORMAL: "normal",
  WARNING: "warning",
  HIGH: "high",
} as const

export type PriceRisk = (typeof PRICE_RISK)[keyof typeof PRICE_RISK]

export const PRICE_RISK_REASON = {
  SYMBOLIC_PRICE: "SYMBOLIC_PRICE",
  EXTREMELY_LOW_PRICE: "EXTREMELY_LOW_PRICE",
  SUSPICIOUS_PATTERN: "SUSPICIOUS_PATTERN",
  OUTLIER_PRICE: "OUTLIER_PRICE",
} as const

export type PriceRiskReason = (typeof PRICE_RISK_REASON)[keyof typeof PRICE_RISK_REASON]

export const PRICE_INTEGRITY_EVENT = {
  WARNING_SHOWN: "WARNING_SHOWN",
  WARNING_ACCEPTED: "WARNING_ACCEPTED",
  WARNING_EDITED: "WARNING_EDITED",
  HIGH_RISK_DETECTED: "HIGH_RISK_DETECTED",
  SELLER_CONFIRMED: "SELLER_CONFIRMED",
} as const

export type PriceIntegrityEventType =
  (typeof PRICE_INTEGRITY_EVENT)[keyof typeof PRICE_INTEGRITY_EVENT]

export const REPORT_MODERATION_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  REJECTED: "REJECTED",
} as const

export type ReportModerationStatus =
  (typeof REPORT_MODERATION_STATUS)[keyof typeof REPORT_MODERATION_STATUS]

export interface CategoryPriceStats {
  median: number
  sampleSize: number
}

export interface SellerPriceContext {
  isNewSeller: boolean
}

export interface AnalyzePriceInput {
  price: number
  currencyCode?: "ARS" | "USD"
  categoryStats?: CategoryPriceStats | null
  seller?: SellerPriceContext
}

export interface PriceIntegrityResult {
  risk: PriceRisk
  reasons: PriceRiskReason[]
  requiresConfirmation: boolean
}

export interface PriceReputation {
  respectedCount: number
  notRespectedCount: number
  sampleSize: number
  priceRespectRate: number | null
  visible: boolean
}

export const MIN_OUTLIER_SAMPLE = 20
export const MIN_PUBLIC_PRICE_RESPECT_RATINGS = 5
export const PRICE_INTEGRITY_MAX_AUTO_LEVEL = 4
