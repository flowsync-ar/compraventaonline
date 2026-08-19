-- ------------------------------------------------------------
-- Social accounts a seller wants to publish their listings to
-- (Instagram, Facebook, TikTok), plus a per-listing record of which
-- platforms the seller authorized sharing to.
--
-- IMPORTANT — this is deliberately NOT real OAuth yet. Actually posting on
-- a seller's behalf requires a Meta developer app (Instagram/Facebook)
-- and a TikTok developer app, each reviewed and approved for content-
-- publishing permissions by the platform itself — that's an external,
-- days-long process this migration can't shortcut. `access_token` /
-- `refresh_token` are here, nullable and unused for now, so that once
-- those apps are approved the real OAuth flow can start writing to this
-- same table without another migration. Until then, "connecting" an
-- account just records the handle the seller wants associated with their
-- shares — good enough to generate the watermarked image + caption they
-- can paste in manually.
-- ------------------------------------------------------------

CREATE TYPE social_platform AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TIKTOK');

CREATE TABLE seller_social_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id     uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  platform      social_platform NOT NULL,
  handle        text NOT NULL,
  access_token  text,
  refresh_token text,
  connected_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, platform)
);

ALTER TABLE seller_social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seller_social_accounts: seller manages own"
  ON seller_social_accounts FOR ALL
  USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()))
  WITH CHECK (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()));

-- Which platforms the seller checked off when publishing this listing —
-- feeds the manual-share modal today, and will feed real auto-posting
-- once the OAuth integrations exist.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS share_to_social social_platform[];
