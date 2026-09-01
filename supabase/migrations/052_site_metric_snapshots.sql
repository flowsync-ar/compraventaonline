-- Periodic marketplace + infra snapshots for the launch campaign.
-- Written only by service_role (cron / admin capture). Not exposed to anon.

CREATE TABLE IF NOT EXISTS public.site_metric_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at timestamptz NOT NULL DEFAULT now(),
  captured_at_art text NOT NULL,
  label text,
  payload jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_site_metric_snapshots_captured_at
  ON public.site_metric_snapshots (captured_at DESC);

ALTER TABLE public.site_metric_snapshots ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.site_metric_snapshots FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.site_metric_snapshots TO service_role;
