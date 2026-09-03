-- Marks questions sent from the admin panel (cuentas fantasma).
-- Sellers still see a normal buyer question; admin can filter and manage them.

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS from_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.questions.from_admin IS
  'true = enviada desde el panel admin con una cuenta fantasma.';

CREATE INDEX IF NOT EXISTS questions_from_admin_true_idx
  ON public.questions (listing_id)
  WHERE from_admin = true;
