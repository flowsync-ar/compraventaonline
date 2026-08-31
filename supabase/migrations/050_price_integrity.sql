-- Price integrity V1: risk stamps, history, report moderation, ratings dimension.
-- Detector logic mirrors frontend/src/lib/priceIntegrity/analyzePrice.ts (keep in sync).

CREATE TYPE public.price_risk_level AS ENUM ('normal', 'warning', 'high');
CREATE TYPE public.price_integrity_event_type AS ENUM (
  'WARNING_SHOWN',
  'WARNING_ACCEPTED',
  'WARNING_EDITED',
  'HIGH_RISK_DETECTED',
  'SELLER_CONFIRMED'
);
CREATE TYPE public.report_moderation_status AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

ALTER TYPE public.report_reason ADD VALUE IF NOT EXISTS 'MISLEADING_PRICE';

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS price_risk public.price_risk_level NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS price_risk_reasons text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price_seller_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclude_from_price_sort boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_listings_status_price_sort
  ON public.listings (status, exclude_from_price_sort, price);

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS price_integrity_level smallint NOT NULL DEFAULT 0
    CONSTRAINT sellers_price_integrity_level_check CHECK (price_integrity_level BETWEEN 0 AND 5);

ALTER TABLE public.seller_ratings
  ADD COLUMN IF NOT EXISTS respected_published_price boolean;

ALTER TABLE public.product_reports
  ADD COLUMN IF NOT EXISTS status public.report_moderation_status NOT NULL DEFAULT 'PENDING';

DELETE FROM public.product_reports a
USING public.product_reports b
WHERE a.reporter_id IS NOT NULL
  AND a.listing_id = b.listing_id
  AND a.reporter_id = b.reporter_id
  AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS product_reports_listing_reporter_unique
  ON public.product_reports (listing_id, reporter_id)
  WHERE reporter_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_reports_status_reason
  ON public.product_reports (status, reason);

CREATE TABLE IF NOT EXISTS public.listing_price_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  old_price   numeric(14, 2),
  new_price   numeric(14, 2) NOT NULL,
  currency_id uuid REFERENCES public.currencies(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_price_history_listing_id
  ON public.listing_price_history (listing_id, created_at DESC);

ALTER TABLE public.listing_price_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.price_integrity_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  seller_id   uuid REFERENCES public.sellers(id) ON DELETE SET NULL,
  event_type  public.price_integrity_event_type NOT NULL,
  risk        public.price_risk_level,
  reasons     text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_integrity_events_created
  ON public.price_integrity_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_integrity_events_seller
  ON public.price_integrity_events (seller_id, created_at DESC);

ALTER TABLE public.price_integrity_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.compute_price_risk(p_price numeric)
RETURNS TABLE(risk public.price_risk_level, reasons text[], exclude_sort boolean)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_risk public.price_risk_level := 'normal';
  v_reasons text[] := '{}';
  v_int bigint;
  v_digits text;
BEGIN
  IF p_price IS NULL OR p_price <= 0 THEN
    v_risk := 'high';
    v_reasons := array_append(v_reasons, 'SYMBOLIC_PRICE');
  ELSIF p_price <= 100 THEN
    v_risk := 'high';
    v_reasons := array_append(v_reasons, 'SYMBOLIC_PRICE');
  ELSIF p_price < 1000 THEN
    v_risk := 'warning';
    v_reasons := array_append(v_reasons, 'EXTREMELY_LOW_PRICE');
  END IF;

  IF p_price IS NOT NULL AND p_price > 0 THEN
    v_int := round(p_price);
    v_digits := v_int::text;
    IF v_int IN (123, 1234, 12345)
       OR (length(v_digits) BETWEEN 2 AND 4 AND v_digits ~ '^(\d)\1+$') THEN
      v_reasons := array_append(v_reasons, 'SUSPICIOUS_PATTERN');
      IF v_risk = 'normal' THEN
        v_risk := 'warning';
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT v_risk, v_reasons, (v_risk = 'high');
END;
$$;

CREATE OR REPLACE FUNCTION public.listings_apply_price_risk()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  computed record;
BEGIN
  SELECT * INTO computed FROM public.compute_price_risk(NEW.price);
  NEW.price_risk := computed.risk;
  NEW.price_risk_reasons := computed.reasons;
  NEW.exclude_from_price_sort := computed.exclude_sort;

  IF TG_OP = 'UPDATE' AND NEW.price IS DISTINCT FROM OLD.price THEN
    NEW.price_seller_confirmed := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_apply_price_risk ON public.listings;
CREATE TRIGGER trg_listings_apply_price_risk
  BEFORE INSERT OR UPDATE OF price ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.listings_apply_price_risk();

CREATE OR REPLACE FUNCTION public.listings_log_price_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.listing_price_history (listing_id, old_price, new_price, currency_id)
    VALUES (NEW.id, NULL, NEW.price, NEW.currency_id);
  ELSIF NEW.price IS DISTINCT FROM OLD.price THEN
    INSERT INTO public.listing_price_history (listing_id, old_price, new_price, currency_id)
    VALUES (NEW.id, OLD.price, NEW.price, NEW.currency_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_log_price_history ON public.listings;
CREATE TRIGGER trg_listings_log_price_history
  AFTER INSERT OR UPDATE OF price ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.listings_log_price_history();

CREATE OR REPLACE FUNCTION public.bump_price_integrity_on_confirmed_report()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.reason::text = 'MISLEADING_PRICE'
     AND NEW.status = 'CONFIRMED'
     AND (OLD.status IS DISTINCT FROM 'CONFIRMED') THEN
    UPDATE public.sellers
    SET price_integrity_level = LEAST(4, price_integrity_level + 1)
    WHERE id = (SELECT seller_id FROM public.listings WHERE id = NEW.listing_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_price_integrity_on_confirmed_report ON public.product_reports;
CREATE TRIGGER trg_bump_price_integrity_on_confirmed_report
  AFTER UPDATE OF status ON public.product_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_price_integrity_on_confirmed_report();

REVOKE UPDATE (
  price_risk,
  price_risk_reasons,
  price_seller_confirmed,
  exclude_from_price_sort
) ON public.listings FROM anon, authenticated;

REVOKE UPDATE (price_integrity_level) ON public.sellers FROM anon, authenticated;

UPDATE public.listings
SET price = price
WHERE true;
