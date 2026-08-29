CREATE TABLE IF NOT EXISTS category_suggestions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  suggested_name  text NOT NULL,
  status          text NOT NULL DEFAULT 'PENDING',
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT category_suggestions_status_check CHECK (status IN ('PENDING', 'DONE', 'DISMISSED'))
);

CREATE INDEX IF NOT EXISTS idx_category_suggestions_status ON category_suggestions (status, created_at DESC);

ALTER TABLE category_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_suggestions: seller can insert own"
  ON category_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  );

CREATE POLICY "category_suggestions: seller can read own"
  ON category_suggestions FOR SELECT
  TO authenticated
  USING (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  );
