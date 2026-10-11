-- Remove a redundant unique index on the anime source identity.
-- Verified that this index and anime_source_provider_id_key had identical
-- definitions and neither index backed a table constraint.
DROP INDEX IF EXISTS public.anime_source_identity_unique_idx;
