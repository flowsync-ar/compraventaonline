-- ------------------------------------------------------------
-- Audit log for the admin "Lista de Precios" tool: bulk price increases
-- (percent or fixed amount) applied to a business seller's listings on
-- their request. One row per listing touched by a single bulk operation —
-- lets support trace "who changed this price and by how much" later.
-- Admin-only, no client policies: written exclusively via service_role
-- from /api/admin/pricing/bulk-update.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS price_adjustments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  seller_id   uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  mode        text NOT NULL CHECK (mode IN ('PERCENT', 'FIXED')),
  value       numeric(10, 2) NOT NULL,
  old_price   numeric(10, 2) NOT NULL,
  new_price   numeric(10, 2) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_adjustments_seller_id ON price_adjustments (seller_id);

ALTER TABLE price_adjustments ENABLE ROW LEVEL SECURITY;
