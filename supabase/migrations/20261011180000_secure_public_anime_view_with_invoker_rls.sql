-- The view's predicates and the public.anime SELECT RLS policy now match.
-- Run the view with caller privileges so the base-table RLS policy is enforced.
ALTER VIEW public.animecia_public_anime SET (security_invoker = true);