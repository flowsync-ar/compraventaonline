-- ONE-TIME DATA CLEANUP — not a schema migration, do not move this into
-- supabase/migrations/. Run once in the SQL Editor, then discard.
--
-- Removes all buy/sell activity and ratings for the two accounts used
-- today to simulate purchases (ramirotule@gmail.com, raminformatik@gmail.com),
-- as either buyer or seller. Restores stock on any listing that got sold
-- via these test orders (adds back one unit per order found, and flips
-- SOLD back to APPROVED if it was only SOLD because of these orders)
-- before deleting the orders themselves — otherwise those listings would
-- stay stuck at stock 0 / VENDIDO forever.

DO $$
DECLARE
  v_seller_ids uuid[];
BEGIN
  SELECT array_agg(s.id) INTO v_seller_ids
  FROM sellers s
  JOIN auth.users u ON u.id = s.user_id
  WHERE u.email IN ('ramirotule@gmail.com', 'raminformatik@gmail.com');

  IF v_seller_ids IS NULL THEN
    RAISE NOTICE 'No sellers found for those emails — nothing to clean up.';
    RETURN;
  END IF;

  -- Restore stock (one unit per test order) and un-SOLD affected listings.
  UPDATE listings l
  SET stock = l.stock + sub.cnt,
      status = CASE WHEN l.status = 'SOLD' THEN 'APPROVED' ELSE l.status END
  FROM (
    SELECT listing_id, COUNT(*) AS cnt
    FROM orders
    WHERE buyer_id = ANY(v_seller_ids) OR seller_id = ANY(v_seller_ids)
    GROUP BY listing_id
  ) sub
  WHERE sub.listing_id = l.id;

  -- Ratings given or received by either account.
  DELETE FROM buyer_ratings WHERE seller_id = ANY(v_seller_ids) OR buyer_id = ANY(v_seller_ids);
  DELETE FROM seller_ratings WHERE seller_id = ANY(v_seller_ids) OR buyer_id = ANY(v_seller_ids);

  -- Orders where either account was buyer or seller.
  DELETE FROM orders WHERE buyer_id = ANY(v_seller_ids) OR seller_id = ANY(v_seller_ids);

  -- Reset reputation points/tier earned from the ratings just deleted.
  UPDATE sellers
  SET score = 0, tier = 'BRONCE', buyer_score = 0, buyer_tier = 'BRONCE'
  WHERE id = ANY(v_seller_ids);
END $$;
