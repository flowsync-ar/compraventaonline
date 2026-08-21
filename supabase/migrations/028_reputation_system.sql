-- ------------------------------------------------------------
-- Real reputation system, replacing the static score/tier that's existed
-- since 002_missing_columns.sql but that nothing in the app ever actually
-- updated (every seller has been stuck at the literal default, 80/BRONCE,
-- since signup — see conversation).
--
-- Mechanics (applies identically to sellers AND buyers — see
-- buyer_score/buyer_tier below):
--   POSITIVA rating -> +10 lifetime points
--   NEUTRAL  rating -> +2  lifetime points
--   NEGATIVA rating -> -5  lifetime points (floored at 0, never negative)
--
-- Tiers are lifetime-points ranges, not a 0-100 percentage anymore (the
-- old score/10 "★ X.X" display no longer applies — the app now shows
-- "tier · N pts" instead):
--   BRONCE  0-49  |  PLATA 50-149  |  GOLD (shown as "ORO") 150-299  |  PREMIUM 300+
-- ------------------------------------------------------------

-- The missing other half of the mutual rating system: buyer_ratings
-- (027_buyer_ratings.sql) lets a seller rate a buyer; this is a seller
-- can be rated too. Same shape, same enum, mirrored RLS.
CREATE TABLE IF NOT EXISTS seller_ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  seller_id   uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  buyer_id    uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  rating      buyer_rating_value NOT NULL,
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_ratings_seller_id ON seller_ratings (seller_id);

ALTER TABLE seller_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seller_ratings: buyer can insert for own paid order"
  ON seller_ratings FOR INSERT
  WITH CHECK (
    buyer_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = seller_ratings.order_id
        AND orders.buyer_id = seller_ratings.buyer_id
        AND orders.seller_id = seller_ratings.seller_id
        AND orders.status = 'PAID'
    )
  );

CREATE POLICY "seller_ratings: buyer can read own given ratings"
  ON seller_ratings FOR SELECT
  USING (buyer_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()));

CREATE POLICY "seller_ratings: seller can read own received ratings"
  ON seller_ratings FOR SELECT
  USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()));

-- Drop the old 0-100 cap on the seller score — it's lifetime points now.
ALTER TABLE sellers
  ALTER COLUMN score SET DEFAULT 0,
  DROP CONSTRAINT IF EXISTS sellers_score_check;

-- Buyer's own reputation — separate columns from the seller ones above,
-- since one account can (and usually does) act as both.
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS buyer_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buyer_tier  text NOT NULL DEFAULT 'BRONCE'
                              CHECK (buyer_tier IN ('BRONCE', 'PLATA', 'GOLD', 'PREMIUM'));

-- Every existing seller is sitting at the untouched legacy default
-- (80/BRONCE) — reset to the new system's own starting point (0/BRONCE)
-- instead of grandfathering in a score nobody actually earned.
UPDATE sellers SET score = 0 WHERE score = 80;

CREATE OR REPLACE FUNCTION tier_for_points(points integer)
RETURNS text AS $$
BEGIN
  IF points >= 300 THEN RETURN 'PREMIUM';
  ELSIF points >= 150 THEN RETURN 'GOLD';
  ELSIF points >= 50 THEN RETURN 'PLATA';
  ELSE RETURN 'BRONCE';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION rating_points_delta(p_rating buyer_rating_value)
RETURNS integer AS $$
BEGIN
  RETURN CASE p_rating
    WHEN 'POSITIVA' THEN 10
    WHEN 'NEUTRAL'  THEN 2
    WHEN 'NEGATIVA' THEN -5
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp;

-- SECURITY DEFINER: the row being updated (the buyer's/seller's sellers
-- row) is NOT the same row the RLS-authenticated rater owns, so this has
-- to bypass RLS deliberately — scoped to exactly this points update, not a
-- general-purpose bypass.
CREATE OR REPLACE FUNCTION update_buyer_reputation()
RETURNS TRIGGER AS $$
DECLARE new_points integer;
BEGIN
  UPDATE sellers
    SET buyer_score = GREATEST(0, buyer_score + rating_points_delta(NEW.rating))
    WHERE id = NEW.buyer_id
    RETURNING buyer_score INTO new_points;
  UPDATE sellers SET buyer_tier = tier_for_points(new_points) WHERE id = NEW.buyer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_update_buyer_reputation ON buyer_ratings;
CREATE TRIGGER trg_update_buyer_reputation
  AFTER INSERT ON buyer_ratings
  FOR EACH ROW EXECUTE FUNCTION update_buyer_reputation();

CREATE OR REPLACE FUNCTION update_seller_reputation()
RETURNS TRIGGER AS $$
DECLARE new_points integer;
BEGIN
  UPDATE sellers
    SET score = GREATEST(0, score + rating_points_delta(NEW.rating))
    WHERE id = NEW.seller_id
    RETURNING score INTO new_points;
  UPDATE sellers SET tier = tier_for_points(new_points) WHERE id = NEW.seller_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_update_seller_reputation ON seller_ratings;
CREATE TRIGGER trg_update_seller_reputation
  AFTER INSERT ON seller_ratings
  FOR EACH ROW EXECUTE FUNCTION update_seller_reputation();
