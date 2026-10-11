-- Prevent authenticated users from probing membership in arbitrary message threads.
CREATE OR REPLACE FUNCTION public.is_message_thread_member(
  p_thread_id uuid,
  p_user_id uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE
    WHEN (SELECT auth.uid()) IS NULL THEN false
    WHEN p_user_id IS NULL OR p_user_id = (SELECT auth.uid()) THEN EXISTS (
      SELECT 1
      FROM public.message_members mm
      WHERE mm.thread_id = p_thread_id
        AND mm.user_id = (SELECT auth.uid())
    )
    WHEN EXISTS (
      SELECT 1
      FROM public.message_members mm
      WHERE mm.thread_id = p_thread_id
        AND mm.user_id = (SELECT auth.uid())
    ) THEN EXISTS (
      SELECT 1
      FROM public.message_members mm
      WHERE mm.thread_id = p_thread_id
        AND mm.user_id = p_user_id
    )
    ELSE false
  END;
$function$;
