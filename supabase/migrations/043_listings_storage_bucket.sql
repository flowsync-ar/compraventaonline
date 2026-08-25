-- ------------------------------------------------------------
-- The "listings" Storage bucket was referenced from the app
-- (dashboard/page.tsx uploads product photos to it) but never actually
-- created/configured via migration — no bucket row, no RLS policy on
-- storage.objects. Every upload attempt was failing, and the app was
-- silently falling back to embedding the raw image as a base64 data URI
-- directly in products.images instead of surfacing the error. That
-- fallback is what's been driving Supabase egress: every query that
-- touches products.images (search, home, listing detail, favorites...)
-- was shipping multi-hundred-KB base64 strings in the JSON payload,
-- repeated on every single page load.
--
-- Path structure used by the app: `${sellerId}/${listingId}/${filename}`
-- where sellerId is sellers.id (NOT auth.uid() directly, unlike the
-- avatars bucket) — see handleImageFiles/handleBulkRowImageFiles in
-- dashboard/page.tsx. Policies below scope uploads to "your own
-- seller_id folder" via a subquery against sellers.user_id = auth.uid().
-- ------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "listings: owner can upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listings'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "listings: owner can update own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'listings'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "listings: owner can delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listings'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "listings: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listings');
