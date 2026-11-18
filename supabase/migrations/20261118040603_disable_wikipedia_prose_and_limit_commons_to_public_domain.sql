update public.catalog_sources
set is_enabled = false,
    rights_review_status = 'pending',
    rights_notes = 'Article prose extraction is disabled. ANIXIA does not copy Wikipedia article text; only non-prose structured metadata from approved sources is used.'
where code = 'japanese_wikipedia';

update public.catalog_sources
set is_enabled = true,
    rights_review_status = 'approved',
    rights_reviewed_at = now(),
    rights_notes = 'Poster files are eligible only when file metadata exposes a verified CC0 or public-domain license and a valid license URL. CC BY, CC BY-SA, non-commercial, no-derivatives, fair-use, all-rights-reserved, ambiguous, or missing-license files are rejected. File description page and license URL are stored.'
where code = 'wikimedia_commons';

update public.catalog_sources
set is_enabled = true
where code = 'wikidata';