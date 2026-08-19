-- ------------------------------------------------------------
-- Username (unique handle, chosen at signup) + avatar upload support.
--
-- Usernames are always stored/compared lowercase (enforced app-side, both
-- on the client and the register API route) — simpler than a lower()
-- functional unique index and sidesteps ILIKE's wildcard-on-underscore
-- footgun (usernames allow underscores, which ILIKE would treat as a
-- single-char wildcard if used for a case-insensitive lookup).
-- ------------------------------------------------------------

ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS username text UNIQUE;

ALTER TABLE sellers
  ADD CONSTRAINT sellers_username_format
  CHECK (username IS NULL OR username ~ '^[a-z0-9_.]{3,30}$');

-- avatar_url already exists (001_initial.sql) — unused until now.

-- Storage bucket for profile photos. Upload happens server-side (register
-- API route, service-role client) right after account creation, since the
-- browser has no session yet at that point (email confirmation is still
-- pending) — same reasoning as hero-slides using the admin client instead
-- of storage RLS policies.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
