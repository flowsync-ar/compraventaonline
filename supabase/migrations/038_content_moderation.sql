-- ------------------------------------------------------------
-- Blocks profanity/insults in product listings (name, brand, description) and
-- buyer<->seller messages (questions.question, questions.answer).
--
-- Enforced with a trigger, not a TypeScript check before insert: both
-- products and questions are written directly from the browser via the
-- Supabase client (see dashboard/page.tsx and listings/[id]/page.tsx),
-- there is no API route in front of those inserts to gate — a trigger is
-- the only place this can't be bypassed. Same reasoning as the existing
-- contact-info redaction on questions (011_question_admin_moderation.sql).
--
-- The wordlist lives in a table (not hardcoded in the function body) so it
-- can grow without a new migration per word, and stays greppable/auditable.
-- Matching uses Postgres's `\y` (word boundary) so short terms like "gil"
-- or "rata" don't false-positive inside "frágil"/"Gilberto" or "barata" —
-- a plain substring check would block half the marketplace's normal
-- listings (e.g. "puta" is a substring of "computadora", "culo" of
-- "vehículo"). unaccent() on both sides means the wordlist doesn't need
-- duplicate accented/unaccented entries.
-- ------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS moderation_words (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term        text NOT NULL UNIQUE,
  category    text NOT NULL CHECK (category IN (
                'insult', 'profanity', 'threat', 'sexual',
                'discriminatory', 'spam', 'off_platform'
              )),
  severity    text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Only 'medium'/'high' terms actually block content (see
-- check_moderation_text below) — 'low' severity words (gil, salame, rata)
-- are logged for reference but never rejected, they're too ambiguous in
-- everyday Spanish.
INSERT INTO moderation_words (term, category, severity) VALUES
  ('boludo', 'insult', 'medium'),
  ('boluda', 'insult', 'medium'),
  ('pelotudo', 'insult', 'medium'),
  ('pelotuda', 'insult', 'medium'),
  ('forro', 'insult', 'medium'),
  ('forra', 'insult', 'medium'),
  ('gil', 'insult', 'low'),
  ('gila', 'insult', 'low'),
  ('salame', 'insult', 'low'),
  ('tarado', 'insult', 'medium'),
  ('tarada', 'insult', 'medium'),
  ('idiota', 'insult', 'medium'),
  ('imbecil', 'insult', 'medium'),
  ('estupido', 'insult', 'medium'),
  ('estupida', 'insult', 'medium'),
  ('pajero', 'insult', 'high'),
  ('pajera', 'insult', 'high'),
  ('mamerto', 'insult', 'low'),
  ('mamerta', 'insult', 'low'),
  ('chanta', 'insult', 'medium'),
  ('garca', 'insult', 'medium'),
  ('ortiva', 'insult', 'medium'),
  ('ortiba', 'insult', 'medium'),
  ('boton', 'insult', 'medium'),
  ('buchon', 'insult', 'medium'),
  ('atorrante', 'insult', 'medium'),
  ('croto', 'insult', 'medium'),
  ('crota', 'insult', 'medium'),
  ('rata', 'insult', 'low'),
  ('lacra', 'insult', 'medium'),
  ('mugriento', 'insult', 'medium'),
  ('mugrienta', 'insult', 'medium'),
  ('puta', 'profanity', 'high'),
  ('puto', 'profanity', 'high'),
  ('putita', 'profanity', 'high'),
  ('mierda', 'profanity', 'medium'),
  ('carajo', 'profanity', 'medium'),
  ('concha', 'profanity', 'high'),
  ('conchudo', 'insult', 'high'),
  ('conchuda', 'insult', 'high'),
  ('culo', 'profanity', 'medium'),
  ('culiado', 'profanity', 'high'),
  ('culiada', 'profanity', 'high'),
  ('hijo de puta', 'insult', 'high'),
  ('hija de puta', 'insult', 'high'),
  ('hijo de mil puta', 'insult', 'high'),
  ('la puta que te pario', 'insult', 'high'),
  ('la concha de tu madre', 'insult', 'high'),
  ('andate a la mierda', 'insult', 'high'),
  ('anda a la mierda', 'insult', 'high'),
  ('andate a cagar', 'insult', 'medium'),
  ('anda a cagar', 'insult', 'medium')
ON CONFLICT (term) DO NOTHING;

CREATE OR REPLACE FUNCTION check_moderation_text(input_text text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM moderation_words
    WHERE severity IN ('medium', 'high')
      AND unaccent(input_text) ~* ('\y' || unaccent(term) || '\y')
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION check_moderation_products()
RETURNS TRIGGER AS $$
BEGIN
  IF check_moderation_text(NEW.name)
     OR check_moderation_text(NEW.brand)
     OR check_moderation_text(NEW.description) THEN
    RAISE EXCEPTION 'Tu publicación contiene lenguaje que no está permitido en la plataforma. Revisá el título, la marca y la descripción.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_check_moderation ON products;
CREATE TRIGGER trg_products_check_moderation
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION check_moderation_products();

CREATE OR REPLACE FUNCTION check_moderation_questions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.question IS NOT NULL AND NOT COALESCE(NEW.question_deleted, false)
     AND check_moderation_text(NEW.question) THEN
    RAISE EXCEPTION 'Tu mensaje contiene lenguaje que no está permitido en la plataforma.';
  END IF;

  IF NEW.answer IS NOT NULL AND NOT COALESCE(NEW.answer_deleted, false)
     AND check_moderation_text(NEW.answer) THEN
    RAISE EXCEPTION 'Tu respuesta contiene lenguaje que no está permitido en la plataforma.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Named to sort before trg_questions_redact_contact_info (same BEFORE
-- event, alphabetical firing order) — a message with both a slur and a
-- phone number gets rejected outright instead of silently redacted.
DROP TRIGGER IF EXISTS trg_questions_check_moderation ON questions;
CREATE TRIGGER trg_questions_check_moderation
  BEFORE INSERT OR UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION check_moderation_questions();
