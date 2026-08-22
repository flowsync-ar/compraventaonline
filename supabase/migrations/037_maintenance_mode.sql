-- ------------------------------------------------------------
-- Site-wide maintenance mode toggle, editable from /admin/configuracion.
-- When true, proxy.ts redirects every public page request to /mantenimiento
-- — /admin/* stays reachable (so the admin can turn it back off) and API
-- routes are left alone (a redirect would break JSON-expecting callers).
-- ------------------------------------------------------------

ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS maintenance_mode boolean NOT NULL DEFAULT false;
