-- ------------------------------------------------------------
-- Platform-wide settings editable from the admin panel. Starts with just
-- the paid "Destacar publicación" price/duration (034_paid_highlights.sql
-- hardcoded these), but is a real table — not a single env var — so future
-- settings can be added as columns without a new table each time.
--
-- Singleton row enforced via a boolean primary key that can only ever be
-- `true` (the CHECK constraint rejects a `false` row, and the PK rejects a
-- second `true` row) — a standard Postgres trick for "exactly one row".
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS platform_settings (
  id                       boolean PRIMARY KEY DEFAULT true,
  highlight_price          numeric(10, 2) NOT NULL DEFAULT 10000,
  highlight_duration_days  integer NOT NULL DEFAULT 30,
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_singleton CHECK (id)
);

INSERT INTO platform_settings (id) VALUES (true)
  ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER trg_platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Public read — the dashboard's "Destacar" button shows the live price to
-- sellers before they pay. Writes are admin-only (via service_role, see
-- /api/admin/settings).
CREATE POLICY "platform_settings: public read"
  ON platform_settings FOR SELECT
  USING (true);
