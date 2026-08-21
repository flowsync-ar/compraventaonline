-- Same "optional" pattern as title (029) and the overlay toggle (030),
-- now for the CTA button — a pure banner slide might not want a
-- "Ver más" pointing anywhere.
ALTER TABLE hero_slides
  ADD COLUMN IF NOT EXISTS show_cta boolean NOT NULL DEFAULT true;
