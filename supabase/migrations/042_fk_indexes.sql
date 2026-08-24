-- ------------------------------------------------------------
-- Postgres does NOT auto-index foreign key columns (only the referenced
-- PK gets one). listings.seller_id / product_id / currency_id and
-- products.category_id had none — every embedded join PostgREST does for
-- /search (listings -> products -> categories, listings -> sellers,
-- listings -> currencies) was falling back to a sequential scan on the
-- referencING side. This was the dominant cost behind /search feeling
-- slow (~2s in application code alone), not the status/sort filter
-- 041 already covers.
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_listings_seller_id   ON listings (seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_product_id  ON listings (product_id);
CREATE INDEX IF NOT EXISTS idx_listings_currency_id ON listings (currency_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
