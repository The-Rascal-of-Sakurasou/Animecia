-- Re-run the current policy for unique works whose old sensitive tag reason is
-- stale after the tag set was narrowed. The trigger keeps all other exclusions.
UPDATE public.anime
SET is_sensitive_visual = false
WHERE catalog_policy_reasons @> ARRAY['sensitive_visual_exclusion']::text[]
  AND COALESCE(is_sensitive_visual, false) = false
  AND COALESCE(duplicate_status, 'unique') = 'unique';
