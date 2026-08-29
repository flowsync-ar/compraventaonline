-- Admin-toggled complimentary FEATURED. Default off. Owners cannot flip
-- this via the sellers UPDATE policy — only service_role (admin API).
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS highlight_free boolean NOT NULL DEFAULT false;

UPDATE sellers
SET highlight_free = true
WHERE lower(email) IN ('ramirotule@gmail.com', 'raminformatik@gmail.com');

CREATE OR REPLACE FUNCTION protect_seller_highlight_free()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.highlight_free IS DISTINCT FROM OLD.highlight_free
     AND current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
    NEW.highlight_free := OLD.highlight_free;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_seller_highlight_free ON sellers;
CREATE TRIGGER trg_protect_seller_highlight_free
  BEFORE UPDATE ON sellers
  FOR EACH ROW
  EXECUTE FUNCTION protect_seller_highlight_free();
