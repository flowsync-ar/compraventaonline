-- Slides can now be published without a title (image-only, e.g. a pure
-- promo banner) — same "optional" pattern eyebrow already had, but as a
-- real NULL instead of an empty string so the frontend can tell "no
-- title" apart from "title left blank by mistake".
ALTER TABLE hero_slides
  ALTER COLUMN title DROP NOT NULL;
