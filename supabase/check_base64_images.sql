-- Diagnostic only — no writes. Shows how many products have base64 data
-- URIs embedded in `images` instead of real Storage URLs, and roughly how
-- many KB that is per row (what gets re-transferred on every query that
-- touches this column).
SELECT
  id,
  name,
  array_length(images, 1) AS image_count,
  (SELECT sum(length(img)) FROM unnest(images) AS img WHERE img LIKE 'data:%') / 1024 AS base64_kb
FROM products
WHERE EXISTS (
  SELECT 1 FROM unnest(images) AS img WHERE img LIKE 'data:%'
)
ORDER BY base64_kb DESC;

-- Total across the whole table:
SELECT
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM unnest(images) AS img WHERE img LIKE 'data:%')) AS affected_products,
  count(*) AS total_products
FROM products;
