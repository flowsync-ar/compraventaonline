-- ------------------------------------------------------------
-- Escrow lifecycle columns for `orders`. Split into its own migration
-- file (after 022_escrow_payments.sql) on purpose — Postgres won't let a
-- freshly-added enum value be used in the same transaction that added it,
-- and Supabase's SQL Editor runs a pasted script as one transaction, so
-- the two must be run as separate statements/pastes.
-- ------------------------------------------------------------

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS release_deadline     timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_at          timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_opened_at    timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason       text,
  ADD COLUMN IF NOT EXISTS refunded_at          timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notes          text;

CREATE INDEX IF NOT EXISTS idx_orders_status_release_deadline
  ON orders (status, release_deadline)
  WHERE status = 'EN_CUSTODIA';
