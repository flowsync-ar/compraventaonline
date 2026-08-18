-- ============================================================
-- Migration 008: Seller email + document_number uniqueness
-- The register endpoint used admin.generateLink({type:"signup"}) to
-- detect duplicate emails, but Supabase obfuscates that response for
-- already-confirmed users when "Confirm email" is enabled (anti email
-- enumeration), returning a fake user with no error instead of failing.
-- So the app needs its own pre-check, which needs the email stored on
-- sellers (it isn't queryable there otherwise, only in auth.users).
-- document_number never had a uniqueness guarantee either — added here
-- for the same reason, since it's the other identity field at signup.
-- ============================================================

ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill from auth.users for sellers created before this migration.
UPDATE sellers s
SET email = u.email
FROM auth.users u
WHERE s.user_id = u.id
  AND s.email IS NULL;

ALTER TABLE sellers
  ALTER COLUMN email SET NOT NULL;

-- Case-insensitive uniqueness — the register endpoint already lowercases
-- the email before use, but this guards direct DB writes too.
CREATE UNIQUE INDEX sellers_email_lower_key ON sellers (lower(email));

-- document_number is optional (not all sellers fill it in at signup),
-- so plain UNIQUE would reject a second NULL. A partial index only
-- enforces uniqueness once a value is actually set.
--
-- Scoped to (document_number, type) rather than just document_number:
-- a sole proprietor in Argentina legitimately reuses the same DNI/CUIT
-- as both their personal seller account and their business account, so
-- that combination must stay allowed. What's actually invalid is two
-- accounts of the SAME type sharing a document_number.
CREATE UNIQUE INDEX sellers_document_number_type_key
  ON sellers (document_number, type)
  WHERE document_number IS NOT NULL;

-- handle_new_user (001_initial.sql) needs to populate the new column.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.sellers (user_id, name, type, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(
      (NEW.raw_user_meta_data->>'seller_type')::seller_type,
      'PERSONAL_SELLER'
    ),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Same visibility rule as phone (003_seller_phone.sql): keep the row
-- public, but don't let anon read the email out of it.
REVOKE SELECT (email) ON sellers FROM anon;
