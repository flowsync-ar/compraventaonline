-- Cuentas semilla / fantasma para movimiento inicial. Borrar con:
--   DELETE FROM auth.users WHERE id IN (SELECT user_id FROM public.sellers WHERE fantasma);
-- (el cascade del perfil depende de las FKs; preferir el flujo de admin Eliminar).

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS fantasma boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.sellers.fantasma IS
  'true = cuenta semilla de movimiento; filtrar así para borrarlas de la base.';

CREATE INDEX IF NOT EXISTS sellers_fantasma_true_idx
  ON public.sellers (id)
  WHERE fantasma = true;

UPDATE public.sellers
SET fantasma = true
WHERE username LIKE 'cvofantasma%'
   OR email ILIKE 'cvo.fantasma%@yahoo.com.mx';
