-- ------------------------------------------------------------
-- TABLE: hero_slides
-- Home page hero carousel, managed from the admin panel.
-- ------------------------------------------------------------
CREATE TABLE hero_slides (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url   text NOT NULL,
  eyebrow     text NOT NULL DEFAULT '',
  title       text NOT NULL,
  cta_label   text NOT NULL DEFAULT 'Ver más',
  href        text NOT NULL DEFAULT '/search',
  sort_order  integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;

-- Public site only reads active slides; the admin panel uses the
-- service-role client and bypasses RLS entirely, so it always sees all rows.
CREATE POLICY "hero_slides: public read active"
  ON hero_slides FOR SELECT
  USING (active = true);

-- Storage bucket for slide images: admin uploads via the service-role
-- client (bypasses RLS), public reads the images directly.
INSERT INTO storage.buckets (id, name, public)
VALUES ('hero-slides', 'hero-slides', true)
ON CONFLICT (id) DO NOTHING;
