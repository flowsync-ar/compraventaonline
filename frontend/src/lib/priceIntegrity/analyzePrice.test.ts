import { describe, expect, it } from "vitest"
import { analyzePrice, isSuspiciousPricePattern } from "./analyzePrice"
import { computePriceReputation } from "./reputation"
import { PRICE_RISK, PRICE_RISK_REASON } from "./types"

describe("isSuspiciousPricePattern", () => {
  it("flags 123 / 999 / 9999", () => {
    expect(isSuspiciousPricePattern(123)).toBe(true)
    expect(isSuspiciousPricePattern(999)).toBe(true)
    expect(isSuspiciousPricePattern(9999)).toBe(true)
  })

  it("does not flag 99999 (typical $99.999)", () => {
    expect(isSuspiciousPricePattern(99999)).toBe(false)
  })

  it("does not flag ordinary prices", () => {
    expect(isSuspiciousPricePattern(150000)).toBe(false)
    expect(isSuspiciousPricePattern(100000)).toBe(false)
  })
})

describe("analyzePrice", () => {
  it("treats 0 and 1 as high symbolic prices", () => {
    for (const price of [0, 1]) {
      const result = analyzePrice({ price })
      expect(result.risk).toBe(PRICE_RISK.HIGH)
      expect(result.reasons).toContain(PRICE_RISK_REASON.SYMBOLIC_PRICE)
      expect(result.requiresConfirmation).toBe(true)
    }
  })

  it("treats 100 as high symbolic", () => {
    const result = analyzePrice({ price: 100 })
    expect(result.risk).toBe(PRICE_RISK.HIGH)
    expect(result.reasons).toContain(PRICE_RISK_REASON.SYMBOLIC_PRICE)
  })

  it("treats 999 as warning (low + pattern)", () => {
    const result = analyzePrice({ price: 999 })
    expect(result.risk).toBe(PRICE_RISK.WARNING)
    expect(result.reasons).toContain(PRICE_RISK_REASON.EXTREMELY_LOW_PRICE)
    expect(result.reasons).toContain(PRICE_RISK_REASON.SUSPICIOUS_PATTERN)
    expect(result.requiresConfirmation).toBe(true)
  })

  it("treats 99999 as normal without market stats", () => {
    const result = analyzePrice({ price: 99999 })
    expect(result.risk).toBe(PRICE_RISK.NORMAL)
    expect(result.requiresConfirmation).toBe(false)
    expect(result.reasons).not.toContain(PRICE_RISK_REASON.SUSPICIOUS_PATTERN)
  })

  it("treats a normal commercial price as normal", () => {
    const result = analyzePrice({ price: 150000 })
    expect(result).toEqual({
      risk: PRICE_RISK.NORMAL,
      reasons: [],
      requiresConfirmation: false,
    })
  })

  it("ignores outliers without enough history", () => {
    const result = analyzePrice({
      price: 1_000_000,
      categoryStats: { median: 100000, sampleSize: 5 },
    })
    expect(result.reasons).not.toContain(PRICE_RISK_REASON.OUTLIER_PRICE)
  })

  it("flags extremely low vs category median as high", () => {
    const result = analyzePrice({
      price: 1000,
      categoryStats: { median: 800000, sampleSize: 40 },
    })
    expect(result.reasons).toContain(PRICE_RISK_REASON.OUTLIER_PRICE)
    expect(result.risk).toBe(PRICE_RISK.HIGH)
  })

  it("flags extremely high vs category median", () => {
    const result = analyzePrice({
      price: 20_000_000,
      categoryStats: { median: 100000, sampleSize: 40 },
    })
    expect(result.reasons).toContain(PRICE_RISK_REASON.OUTLIER_PRICE)
    expect(result.risk).toBe(PRICE_RISK.HIGH)
  })

  it("still warns a trusted seller on bait-like prices", () => {
    const result = analyzePrice({
      price: 1,
      seller: { isNewSeller: false },
    })
    expect(result.risk).toBe(PRICE_RISK.HIGH)
    expect(result.requiresConfirmation).toBe(true)
  })

  it("requires confirmation for new sellers on warning prices", () => {
    const result = analyzePrice({
      price: 500,
      seller: { isNewSeller: true },
    })
    expect(result.risk).toBe(PRICE_RISK.WARNING)
    expect(result.requiresConfirmation).toBe(true)
  })
})

describe("computePriceReputation", () => {
  it("hides a single positive rating", () => {
    const result = computePriceReputation(1, 0)
    expect(result.visible).toBe(false)
    expect(result.priceRespectRate).toBe(1)
  })

  it("shows 98% after enough samples", () => {
    const result = computePriceReputation(49, 1)
    expect(result.visible).toBe(true)
    expect(result.priceRespectRate).toBeCloseTo(0.98)
  })

  it("does not treat one report-equivalent as a public 0%", () => {
    const result = computePriceReputation(0, 1)
    expect(result.visible).toBe(false)
  })
})
