-- Lets the admin choose, per slide, whether the readability-darkening
-- gradient renders over the image. Needed once slides can be pre-made
-- banner graphics with their own baked-in text (see 029, optional
-- title) — the overlay actively hurts those instead of helping.
ALTER TABLE hero_slides
  ADD COLUMN IF NOT EXISTS dark_overlay boolean NOT NULL DEFAULT true;
