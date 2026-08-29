CREATE TABLE IF NOT EXISTS support_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL,
  message     text NOT NULL,
  status      text NOT NULL DEFAULT 'PENDING',
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_messages_status_check CHECK (status IN ('PENDING', 'DONE'))
);

CREATE INDEX IF NOT EXISTS idx_support_messages_status ON support_messages (status, created_at DESC);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
