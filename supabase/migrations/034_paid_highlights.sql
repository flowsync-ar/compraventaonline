-- ------------------------------------------------------------
-- Paid "Destacar publicación": a seller pays a flat fee via Mercado Pago
-- Checkout Pro (the platform's own account, not a connected seller's — this
-- is a platform fee, not marketplace escrow, so it doesn't carry the
-- regulatory concern that got the buyer-protection escrow reverted) to
-- feature one listing for a fixed number of days.
--
-- highlight_orders tracks the payment lifecycle; on approval the webhook
-- inserts into highlighted_products and bumps listings.featured_plan, the
-- same two writes handleClaimReward already does for reward-earned
-- highlights (dashboard/page.tsx).
-- ------------------------------------------------------------

-- highlighted_products never got a `plan` column even though
-- dashboard/page.tsx's handleClaimReward has been inserting one since the
-- reputation system shipped (028_reputation_system.sql) — that insert has
-- been silently failing (its error is never checked), so reward-earned
-- highlights never actually appeared on /destacados or the home page even
-- though listings.featured_plan did get updated. Fixing it here since the
-- paid flow writes to the same table.
ALTER TABLE highlighted_products
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'FEATURED'
                                 CHECK (plan IN ('FEATURED', 'PREMIUM'));

CREATE TABLE IF NOT EXISTS highlight_orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  seller_id         uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  amount            numeric(10, 2) NOT NULL DEFAULT 10000,
  duration_days     integer NOT NULL DEFAULT 30,
  status            text NOT NULL DEFAULT 'PENDING'
                                 CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
  mp_preference_id  text,
  mp_payment_id     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  paid_at           timestamptz
);

CREATE INDEX IF NOT EXISTS idx_highlight_orders_seller_id ON highlight_orders (seller_id);
CREATE INDEX IF NOT EXISTS idx_highlight_orders_listing_id ON highlight_orders (listing_id);

ALTER TABLE highlight_orders ENABLE ROW LEVEL SECURITY;

-- Sellers can see their own purchase attempts (to know if one's pending).
-- Nothing is client-writable — created by the checkout API route, updated
-- only by the webhook, both via the service-role client.
CREATE POLICY "highlight_orders: seller can read own"
  ON highlight_orders FOR SELECT
  USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()));
