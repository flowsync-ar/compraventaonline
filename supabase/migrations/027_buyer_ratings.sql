-- ------------------------------------------------------------
-- Buyer ratings: once a seller confirms they received payment for an
-- order (orders.status -> PAID, see "orders: seller can confirm transfer"
-- policy in 007_orders_and_mercadopago.sql), they rate the buyer's
-- behavior on that transaction. One rating per order — the UNIQUE
-- constraint on order_id is what a client-side "already rated" check
-- relies on, and also what stops a seller from spamming ratings for the
-- same sale.
-- ------------------------------------------------------------

CREATE TYPE buyer_rating_value AS ENUM ('POSITIVA', 'NEUTRAL', 'NEGATIVA');

CREATE TABLE IF NOT EXISTS buyer_ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  seller_id   uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  buyer_id    uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  rating      buyer_rating_value NOT NULL,
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyer_ratings_buyer_id ON buyer_ratings (buyer_id);

ALTER TABLE buyer_ratings ENABLE ROW LEVEL SECURITY;

-- A seller can rate a buyer only for their OWN order, and only once it's
-- actually PAID (confirmed) — mirrors the same guard used to let a seller
-- flip a transfer order to PAID in the first place.
CREATE POLICY "buyer_ratings: seller can insert for own paid order"
  ON buyer_ratings FOR INSERT
  WITH CHECK (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = buyer_ratings.order_id
        AND orders.seller_id = buyer_ratings.seller_id
        AND orders.buyer_id = buyer_ratings.buyer_id
        AND orders.status = 'PAID'
    )
  );

-- Sellers can see the ratings they gave (e.g. to know they already rated
-- an order); buyers can see ratings they received (their own reputation).
CREATE POLICY "buyer_ratings: seller can read own given ratings"
  ON buyer_ratings FOR SELECT
  USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()));

CREATE POLICY "buyer_ratings: buyer can read own received ratings"
  ON buyer_ratings FOR SELECT
  USING (buyer_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()));
