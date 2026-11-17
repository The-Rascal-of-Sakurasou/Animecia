-- ANIXIA: allow users to edit only their own reviews
BEGIN;

DROP POLICY IF EXISTS "users update own reviews" ON public.reviews;
CREATE POLICY "users update own reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

GRANT UPDATE ON public.reviews TO authenticated;

COMMIT;
