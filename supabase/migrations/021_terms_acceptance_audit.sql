-- ------------------------------------------------------------
-- Hardens terms_acceptances into a real compliance audit record: which
-- exact terms version was accepted, and from where/what — needed to
-- actually prove consent later (e.g. in a dispute), not just that a row
-- exists.
--
-- `version` -> `terms_version` (clearer name, matches what gets bumped
-- whenever the terms text changes). `accepted_at` is kept as-is instead of
-- adding a redundant `timestamp` column — it's already a UTC-storing
-- timestamptz, `TIMESTAMP` as a bare column name is also a reserved-word
-- footgun in Postgres best avoided for no real gain.
-- ------------------------------------------------------------

ALTER TABLE terms_acceptances RENAME COLUMN version TO terms_version;

ALTER TABLE terms_acceptances
  ADD COLUMN IF NOT EXISTS user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS ip_address  text,
  ADD COLUMN IF NOT EXISTS user_agent  text;

-- Backfill user_id for any pre-existing rows from their linked seller,
-- then require it going forward — every new row is written server-side
-- (register route), which always has the auth user id on hand.
UPDATE terms_acceptances ta
SET user_id = s.user_id
FROM sellers s
WHERE ta.seller_id = s.id AND ta.user_id IS NULL;

ALTER TABLE terms_acceptances ALTER COLUMN user_id SET NOT NULL;
