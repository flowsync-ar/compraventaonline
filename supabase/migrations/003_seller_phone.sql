-- ============================================================
-- Migration 003: Seller phone (contact reveal for logged-in buyers)
-- ============================================================

ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS phone text;

-- "sellers: public read" (001_initial.sql) keeps the row public for anon,
-- but the phone column specifically is revoked from anon — any anonymous
-- query that selects it fails with permission denied. authenticated keeps
-- its default table-level grant, so any logged-in user can read it.
REVOKE SELECT (phone) ON sellers FROM anon;
