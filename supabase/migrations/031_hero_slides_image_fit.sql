-- Per-slide choice between "cover" (fills the full width, crops overflow —
-- the original/default look, right for photos) and "contain" (shrinks to
-- fit, never crops — right for banner graphics with text baked in near
-- the edges). See conversation: neither one is correct for every slide.
ALTER TABLE hero_slides
  ADD COLUMN IF NOT EXISTS image_fit text NOT NULL DEFAULT 'cover'
                              CHECK (image_fit IN ('cover', 'contain'));
