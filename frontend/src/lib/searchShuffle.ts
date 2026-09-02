// Default search order: paid highlights first, then a deterministic mix
// that changes every hour (America/Argentina/Buenos_Aires). Same hour ⇒
// same order, so pagination and refresh don't jump listings between pages.

export function searchShuffleSeed(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")}-${get("hour")}`
}

export function featuredRank(plan: string): number {
  if (plan === "PREMIUM") return 0
  if (plan === "FEATURED") return 1
  return 2
}

function hash32(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function compareShuffledListings<T extends { id: string; featured_plan: string }>(
  a: T,
  b: T,
  seed: string,
): number {
  const rank = featuredRank(a.featured_plan) - featuredRank(b.featured_plan)
  if (rank !== 0) return rank
  return hash32(`${seed}:${a.id}`) - hash32(`${seed}:${b.id}`)
}
