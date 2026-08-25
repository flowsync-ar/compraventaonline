-- ------------------------------------------------------------
-- Removes everything inserted by loadtest_1000_listings.sql. Run this
-- once you're done measuring — these listings are publicly visible
-- (status = 'APPROVED') while they exist.
-- ------------------------------------------------------------

DELETE FROM listings WHERE product_id IN (
  SELECT id FROM products WHERE name LIKE 'TEST-LOAD-%'
);

DELETE FROM products WHERE name LIKE 'TEST-LOAD-%';
