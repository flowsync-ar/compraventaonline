-- ------------------------------------------------------------
-- Admin moderation for questions/answers, plus automatic redaction of
-- contact info (email/phone) shared in either field — bypassing the
-- platform is against site policy (avoids buyers/sellers dealing outside
-- the marketplace).
--
-- Two independent "deleted" flags because a question and its answer are
-- two different pieces of user content that can each be redacted on their
-- own (e.g. the buyer's question is fine but the seller's answer leaks a
-- phone number).
-- ------------------------------------------------------------

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS answer_deleted boolean NOT NULL DEFAULT false;

-- Auto-redact contact info regardless of insert path (public client, admin
-- API, anything) — a trigger is the only place this can't be bypassed.
--
-- Known limitation: the phone pattern (8+ consecutive digits) can false-
-- positive on things like a big price typed without thousands separators
-- ("45000000" instead of "45.000.000"). Acceptable trade-off for a
-- marketplace this size — erring towards over-redacting contact info
-- rather than under-redacting it.
CREATE OR REPLACE FUNCTION redact_contact_info_in_questions()
RETURNS TRIGGER AS $$
DECLARE
  email_pattern text := '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}';
  phone_pattern text := '(\+?54)?\s*9?\s*\(?\d{2,4}\)?[\s\-\.]?\d{3,4}[\s\-\.]?\d{3,4}|\d{8,}';
BEGIN
  IF NEW.question IS NOT NULL AND NOT NEW.question_deleted
     AND (NEW.question ~* email_pattern OR NEW.question ~ phone_pattern) THEN
    NEW.question := 'Esta pregunta fue eliminada por compartir información de contacto (política del sitio).';
    NEW.question_deleted := true;
  END IF;

  IF NEW.answer IS NOT NULL AND NOT NEW.answer_deleted
     AND (NEW.answer ~* email_pattern OR NEW.answer ~ phone_pattern) THEN
    NEW.answer := 'Esta respuesta fue eliminada por compartir información de contacto (política del sitio).';
    NEW.answer_deleted := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_questions_redact_contact_info ON questions;
CREATE TRIGGER trg_questions_redact_contact_info
  BEFORE INSERT OR UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION redact_contact_info_in_questions();
