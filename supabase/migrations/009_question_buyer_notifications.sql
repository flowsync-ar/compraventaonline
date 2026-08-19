-- ------------------------------------------------------------
-- Buyer notifications: let a buyer know when their question got answered.
--
-- `questions` already tracks `is_read_by_seller` (used for the seller's
-- "unanswered questions" bell). This adds the mirror column for the buyer
-- side, plus the RLS policy that lets a buyer mark their own question read
-- once they've seen the answer (previously buyers had INSERT/SELECT only,
-- no UPDATE at all).
-- ------------------------------------------------------------

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS is_read_by_buyer boolean NOT NULL DEFAULT true;

-- Default true so existing rows (answered before this migration) don't
-- suddenly surface as a wall of stale "you got answered" notifications.
-- Going forward, answering a question flips it back to false (see
-- HeaderSessionBar.tsx handleSendReply).

CREATE POLICY "questions: buyer can mark own as read"
  ON questions FOR UPDATE
  USING (
    buyer_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    buyer_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );
