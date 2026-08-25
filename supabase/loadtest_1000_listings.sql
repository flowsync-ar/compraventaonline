-- ------------------------------------------------------------
-- Load-test seed: 1000 fake APPROVED listings under the seller account
-- for flowsyncar@gmail.com, to stress-test /search at scale.
--
-- Prerequisites:
--   1. flowsyncar@gmail.com must already be a registered seller (sign up
--      on the site first if it isn't yet) — the script fails safely
--      (NOT NULL violation) if no matching seller row exists.
--   2. Run this whole block once. It also force-verifies the seller's
--      identity (039_require_identity_for_listings.sql blocks listings
--      INSERT otherwise).
--
-- WARNING: these listings get status = 'APPROVED', so they'll show up
-- in real search results / the live site for actual visitors while
-- they exist. Run loadtest_1000_listings_cleanup.sql right after
-- you're done measuring to remove them.
-- ------------------------------------------------------------

UPDATE sellers SET identity_verified = true
WHERE lower(email) = lower('flowsyncar@gmail.com');

WITH new_products AS (
  INSERT INTO products (name, brand, description, category_id, images)
  SELECT
    'TEST-LOAD-' || gs || ' - Producto de prueba',
    (ARRAY['Genérica', 'Samsung', 'LG', 'Sony', 'Nike', 'Adidas'])[1 + floor(random() * 6)::int],
    'Descripción de prueba generada para test de carga #' || gs || '. Este producto no es real.',
    (SELECT id FROM categories ORDER BY random() LIMIT 1),
    NULL
  FROM generate_series(1, 1000) AS gs
  RETURNING id
),
seller AS (
  SELECT id FROM sellers WHERE lower(email) = lower('flowsyncar@gmail.com')
),
currency AS (
  SELECT id FROM currencies WHERE code = 'ARS'
)
INSERT INTO listings (seller_id, product_id, currency_id, price, stock, status, condition, featured_plan)
SELECT
  (SELECT id FROM seller),
  np.id,
  (SELECT id FROM currency),
  (5000 + floor(random() * 500000))::numeric(14, 2),
  1 + floor(random() * 10)::int,
  'APPROVED',
  (ARRAY['NEW', 'USED'])[1 + floor(random() * 2)::int],
  'FREE'
FROM new_products np;
