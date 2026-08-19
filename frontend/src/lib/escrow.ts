// Shared constants for the buyer-protection escrow flow (see
// supabase/migrations/022_escrow_payments.sql for the full rationale).
//
// 15 days: a middle ground between MercadoLibre's own release windows
// (8-14 days with their managed shipping, 21-30 when the seller ships
// independently — see chat history) — this app has no shipment-tracking
// integration yet to tell those cases apart, so one flat window is used
// for every order until that's built.
export const ESCROW_RELEASE_WINDOW_DAYS = 15

export function computeReleaseDeadline(fromDate: Date = new Date()): string {
  const deadline = new Date(fromDate)
  deadline.setDate(deadline.getDate() + ESCROW_RELEASE_WINDOW_DAYS)
  return deadline.toISOString()
}
