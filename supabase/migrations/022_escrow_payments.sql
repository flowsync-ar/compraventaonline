-- ------------------------------------------------------------
-- Buyer-protection escrow: Mercado Pago payments now settle into the
-- PLATFORM's own account (not each seller's OAuth-connected one) and stay
-- marked EN_CUSTODIA until the buyer confirms delivery, opens a dispute,
-- or the release window lapses. See conversation notes — Mercado Pago's
-- native deferred-capture only holds funds for 5 days (too short for
-- shipped goods) and requires Checkout API, not the Checkout Pro this app
-- already uses, so the hold is enforced here in our own orders table
-- instead, same principle as how MercadoLibre delays payout availability.
--
-- IMPORTANT: this makes CompraventaOnline itself briefly hold buyer funds
-- before paying sellers out by bank transfer. Confirm with a
-- lawyer/accountant before this goes live with real money — see chat
-- history for the BCRA/PSP considerations already flagged.
-- ------------------------------------------------------------

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'EN_CUSTODIA';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'LIBERADO';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'DISPUTADO';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'REEMBOLSADO';
