-- Resolve confirmed duplicate imports with identical title, format, and season year.
-- Keep the earliest recorded premiere date and point the later import at it.
-- The rows were verified in production: same titles, same year and format,
-- start dates differ by one day, and both records came from AniList imports.

UPDATE public.anime
SET duplicate_status = 'duplicate',
    duplicate_of_id = 598,
    duplicate_group_key = 'same-season:anilist:手札が多めのビクトリア:TV:2026',
    duplicate_review_reason = 'Same title, format and season year as ID 598; later duplicate import with adjacent start date.'
WHERE id = 97
  AND duplicate_status IS DISTINCT FROM 'duplicate';

UPDATE public.anime
SET duplicate_status = 'duplicate',
    duplicate_of_id = 91,
    duplicate_group_key = 'same-season:anilist:日本三國:TV:2026',
    duplicate_review_reason = 'Same title, format and season year as ID 91; later duplicate import with adjacent start date.'
WHERE id = 396
  AND duplicate_status IS DISTINCT FROM 'duplicate';