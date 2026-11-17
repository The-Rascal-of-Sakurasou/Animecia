-- Allow only registered ANIXIA administrators to review unpublished catalog rows.
-- Public users continue to access published rows only through the restricted RPCs.

CREATE POLICY "ANIXIA admins can read catalog candidates"
ON public.anime
FOR SELECT
TO authenticated
USING ((SELECT private.is_anixia_admin()));

CREATE POLICY "ANIXIA admins can update catalog candidates"
ON public.anime
FOR UPDATE
TO authenticated
USING ((SELECT private.is_anixia_admin()))
WITH CHECK ((SELECT private.is_anixia_admin()));

CREATE INDEX IF NOT EXISTS anime_unpublished_updated_at_idx
ON public.anime (updated_at DESC)
WHERE is_published = false;
