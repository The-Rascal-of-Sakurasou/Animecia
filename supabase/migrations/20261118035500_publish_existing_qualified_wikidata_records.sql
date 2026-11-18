-- Re-apply the automatic publication gate to all already-imported Wikidata works.
-- The importer uses ignoreDuplicates to protect existing metadata, so existing
-- candidates need an explicit publication update after qualification.
update public.anime
set is_published = true,
    updated_at = now()
where source = 'wikidata'
  and source_id ~ '^Q[1-9][0-9]*$'
  and title is not null and btrim(title) <> ''
  and title_ja is not null and btrim(title_ja) <> ''
  and release_year >= 1963
  and country_code = 'JP'
  and format in ('tv', 'movie', 'ova', 'web')
  and is_published is distinct from true;
