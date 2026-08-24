-- ------------------------------------------------------------
-- Server-side backstop for "identity verification required to publish".
-- The dashboard already gates the Publicar tab client-side (redirects to
-- /verificar-identidad if sellers.identity_verified is false), but
-- listings are inserted directly from the browser via the Supabase client
-- — no API route in front of it — so a trigger is the only place this
-- can't be bypassed, same reasoning as content_moderation.sql (038) and
-- the contact-info redaction on questions (011).
--
-- Buying has the equivalent check server-side already, in
-- /api/orders/route.ts (that flow already goes through our own API route,
-- so no trigger was needed there).
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_seller_identity_verified()
RETURNS TRIGGER AS $$
DECLARE
  verified boolean;
BEGIN
  SELECT identity_verified INTO verified FROM sellers WHERE id = NEW.seller_id;
  IF NOT COALESCE(verified, false) THEN
    RAISE EXCEPTION 'Necesitás verificar tu identidad antes de publicar.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listings_require_identity ON listings;
CREATE TRIGGER trg_listings_require_identity
  BEFORE INSERT ON listings
  FOR EACH ROW EXECUTE FUNCTION check_seller_identity_verified();
