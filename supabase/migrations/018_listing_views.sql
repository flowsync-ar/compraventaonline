-- ------------------------------------------------------------
-- Per-listing view tracking, so a seller can see how many people are
-- actually looking at their listing (new "Visitas" column in "Mis
-- Publicaciones").
--
-- Dedup rule: the same visitor looking at the same listing multiple times
-- within the same calendar day counts as ONE view, not N — otherwise a
-- seller refreshing their own listing tab 50 times, or a buyer bouncing
-- back and forth while comparing prices, would inflate the number into
-- something meaningless. The UNIQUE constraint below enforces this at the
-- DB level; the insert uses upsert + ignoreDuplicates so a same-day repeat
-- is a silent no-op instead of a unique-violation error.
--
-- viewer_key identifies "who" without needing a real account:
--   - logged-in visitor  -> their sellers.id (stable, survives device swaps)
--   - anonymous visitor  -> a random UUID persisted in a long-lived cookie,
--     created client-side the first time it's needed (see visitorId.ts)
-- Both are just opaque text as far as this table is concerned. The seller
-- viewing their own listing is filtered out before the insert even happens
-- (see the track-view route) — that's not "visibility", that's the seller
-- checking their own post.
-- ------------------------------------------------------------

CREATE TABLE listing_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  viewer_key  text NOT NULL,
  viewed_date date NOT NULL DEFAULT current_date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, viewer_key, viewed_date)
);

CREATE INDEX idx_listing_views_listing_id ON listing_views (listing_id);

-- Only the service-role client ever touches this table (insert from the
-- track-view route, read from the dashboard's own-listings query) — same
-- pattern as page_views. RLS stays enabled with no policies on purpose.
ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;
