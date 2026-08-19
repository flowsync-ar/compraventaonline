-- ------------------------------------------------------------
-- Site visit tracking, for the new admin stats dashboard.
--
-- Deliberately minimal: one row per page load, recorded by the public
-- POST /api/track-visit route (service-role client) fired from a client
-- effect in SiteChrome — only on the public site, never on /admin. No RLS
-- policies are defined here on purpose: only the service-role client
-- (which bypasses RLS entirely) ever touches this table, from either side
-- (insert on visit, read on the admin stats endpoint).
-- ------------------------------------------------------------

CREATE TABLE page_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_views_created_at ON page_views (created_at);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
