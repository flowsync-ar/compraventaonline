-- ------------------------------------------------------------
-- Dedupe site visits by unique visitor per day, same principle as
-- listing_views (018_listing_views.sql): the same person reloading or
-- browsing multiple pages in one day counts as ONE visit, not N.
--
-- visitor_key mirrors visitorId.ts's anonymous cookie (cvo_vid) — no
-- login required to be counted, this is pure traffic, not tied to any
-- seller account.
-- ------------------------------------------------------------

ALTER TABLE page_views
  ADD COLUMN IF NOT EXISTS visitor_key text,
  ADD COLUMN IF NOT EXISTS visit_date  date;

-- Backfill: derive the day from created_at, and give pre-existing rows a
-- synthetic per-row visitor_key so they don't collide with each other (or
-- with real visitors) under the new unique index below — this preserves
-- historical totals instead of silently deduping away old data no one
-- asked to have merged.
UPDATE page_views SET visit_date = created_at::date WHERE visit_date IS NULL;
UPDATE page_views SET visitor_key = 'legacy-' || id::text WHERE visitor_key IS NULL;

ALTER TABLE page_views
  ALTER COLUMN visit_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN visit_date SET NOT NULL,
  ALTER COLUMN visitor_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_page_views_visitor_day ON page_views (visitor_key, visit_date);
