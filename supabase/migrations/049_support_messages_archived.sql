ALTER TABLE support_messages
  DROP CONSTRAINT IF EXISTS support_messages_status_check;

ALTER TABLE support_messages
  ADD CONSTRAINT support_messages_status_check
  CHECK (status IN ('PENDING', 'DONE', 'ARCHIVED'));
