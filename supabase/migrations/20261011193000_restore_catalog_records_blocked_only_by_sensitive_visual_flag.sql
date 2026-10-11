-- The previous workflow incorrectly blocked works based only on sensitive-visual
-- metadata. Re-run the canonical database policy for those unique records.
-- The current trigger intentionally does not treat is_sensitive_visual as an exclusion.
UPDATE public.anime
SET is_sensitive_visual = COALESCE(is_sensitive_visual, false)
WHERE catalog_policy_reasons @> ARRAY['sensitive_visual_exclusion']::text[]
  AND COALESCE(duplicate_status, 'unique') = 'unique';
