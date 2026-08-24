-- ------------------------------------------------------------
-- Optional per-slide mobile image. Desktop banners are wide (built for
-- imageFit "contain" to show a full graphic + text), which on a narrow
-- phone viewport shrinks so much it leaves a big empty gap and unreadable
-- text — HeroCarousel.tsx already forces "cover" as a CSS fallback on
-- mobile for slides without one of these, but a real cropped-for-mobile
-- image (admin-uploaded) looks better than an automatic crop.
-- ------------------------------------------------------------

ALTER TABLE hero_slides
  ADD COLUMN IF NOT EXISTS image_url_mobile text;
