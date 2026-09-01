-- 050 enabled RLS on listing_price_history but never added policies.
-- The AFTER INSERT trigger on listings writes a history row as the
-- seller (SECURITY INVOKER), so publishing failed with:
-- "new row violates row-level security policy for table listing_price_history".

GRANT SELECT, INSERT ON public.listing_price_history TO authenticated;

DROP POLICY IF EXISTS "listing_price_history: owner read" ON public.listing_price_history;
CREATE POLICY "listing_price_history: owner read"
  ON public.listing_price_history
  FOR SELECT
  TO authenticated
  USING (
    listing_id IN (
      SELECT l.id
      FROM public.listings l
      JOIN public.sellers s ON s.id = l.seller_id
      WHERE s.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "listing_price_history: owner insert" ON public.listing_price_history;
CREATE POLICY "listing_price_history: owner insert"
  ON public.listing_price_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    listing_id IN (
      SELECT l.id
      FROM public.listings l
      JOIN public.sellers s ON s.id = l.seller_id
      WHERE s.user_id = (SELECT auth.uid())
    )
  );
