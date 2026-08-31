-- Compare DNI/CUIT and phone by digits so 28.660.386 and 28-660386
-- (or 2954-123456 vs 2954123456) count as the same identity.

CREATE OR REPLACE FUNCTION public.find_seller_identity_conflicts(
  p_document_digits text,
  p_phone_digits text,
  p_seller_type public.seller_type,
  p_exclude_user_id uuid DEFAULT NULL
)
RETURNS TABLE(document_taken boolean, phone_taken boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.sellers s
      WHERE coalesce(p_document_digits, '') <> ''
        AND regexp_replace(coalesce(s.document_number, ''), '\D', '', 'g') = p_document_digits
        AND s.type = p_seller_type
        AND (p_exclude_user_id IS NULL OR s.user_id IS DISTINCT FROM p_exclude_user_id)
    ) AS document_taken,
    EXISTS (
      SELECT 1
      FROM public.sellers s
      WHERE coalesce(p_phone_digits, '') <> ''
        AND regexp_replace(coalesce(s.phone, ''), '\D', '', 'g') = p_phone_digits
        AND (p_exclude_user_id IS NULL OR s.user_id IS DISTINCT FROM p_exclude_user_id)
    ) AS phone_taken;
$$;

REVOKE ALL ON FUNCTION public.find_seller_identity_conflicts(text, text, public.seller_type, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_seller_identity_conflicts(text, text, public.seller_type, uuid)
  TO service_role;
