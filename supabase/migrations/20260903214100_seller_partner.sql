-- Empresas suscriptas: CVO carga el catálogo a nombre del comercio.
-- Los avisos siguen siendo listings.seller_id → este seller (BUSINESS_SELLER).

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS partner boolean NOT NULL DEFAULT false;

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS instagram text;

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS website text;

COMMENT ON COLUMN public.sellers.partner IS
  'Comercio suscripto cuyo catálogo carga y actualiza el equipo CVO.';

CREATE INDEX IF NOT EXISTS sellers_partner_true_idx
  ON public.sellers (id)
  WHERE partner = true;
