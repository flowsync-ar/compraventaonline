-- ------------------------------------------------------------
-- /search filters on status = 'APPROVED' and sorts by created_at (default)
-- or price (price_asc/price_desc), with no index backing either combo —
-- every search was doing a full table scan. This composite index covers
-- the default listing (status + created_at DESC); a separate one covers
-- the price-sorted case.
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_listings_status_created_at
  ON listings (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_status_price
  ON listings (status, price);
