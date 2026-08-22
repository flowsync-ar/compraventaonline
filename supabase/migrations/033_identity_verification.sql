-- ------------------------------------------------------------
-- Identity verification via Didit (docs.didit.me): DNI photo + selfie +
-- liveness, biometric face-match against RENAPER. One row per attempt —
-- a seller can retry, so this is a log, not a 1:1 profile field.
-- sellers.identity_verified is the single source of truth the rest of the
-- app reads; it's only ever set true by the webhook handler once Didit
-- reports status "Approved".
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS identity_verifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id         uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  session_id        text NOT NULL UNIQUE,
  status            text NOT NULL DEFAULT 'PENDING',
  face_match_score  numeric,
  raw_payload       jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identity_verifications_seller_id ON identity_verifications (seller_id);

ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

-- Only the seller themselves can see their own verification attempts.
-- Nothing is client-writable — sessions are created and updated only by
-- the server-role client (API route + webhook handler).
CREATE POLICY "identity_verifications: seller can read own"
  ON identity_verifications FOR SELECT
  USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()));

ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS identity_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified     boolean NOT NULL DEFAULT false;
