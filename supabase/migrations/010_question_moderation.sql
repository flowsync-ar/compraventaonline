-- ------------------------------------------------------------
-- Let a seller hide an out-of-place question from their listing's public
-- Q&A section (spam, insults, off-topic) WITHOUT deleting it — the buyer
-- who asked keeps it in their own view, and nothing is lost if it's ever
-- disputed. No new RLS policy needed: "questions: seller can update
-- (answer)" already covers UPDATE on any column for the listing's owner.
-- ------------------------------------------------------------

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS hidden_by_seller boolean NOT NULL DEFAULT false;
