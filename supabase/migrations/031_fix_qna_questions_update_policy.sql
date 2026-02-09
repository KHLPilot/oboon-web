BEGIN;

DROP POLICY IF EXISTS "qna_questions_update" ON public.qna_questions;

CREATE POLICY "qna_questions_update"
  ON public.qna_questions
  FOR UPDATE
  USING (
    author_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    author_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

COMMIT;
