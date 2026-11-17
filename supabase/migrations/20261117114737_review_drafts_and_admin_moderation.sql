DROP POLICY IF EXISTS "Users create own reviews" ON public.reviews;
CREATE POLICY "Users create own review drafts" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND is_published = false);
DROP POLICY IF EXISTS "Users update own reviews" ON public.reviews;
CREATE POLICY "Users update own review drafts" ON public.reviews
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id AND is_published = false);
CREATE POLICY "Users read own reviews" ON public.reviews
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "ANIXIA admins moderate reviews" ON public.reviews
  FOR UPDATE TO authenticated
  USING (private.is_anixia_admin())
  WITH CHECK (private.is_anixia_admin());
