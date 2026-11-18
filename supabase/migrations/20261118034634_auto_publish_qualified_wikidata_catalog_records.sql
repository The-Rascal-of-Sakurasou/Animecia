-- Automatically publish Wikidata catalog records that satisfy ANIXIA's
-- deterministic inclusion and minimum metadata requirements.
-- Wikidata is CC0; only structured catalog facts are imported.
-- Records without a Japanese title remain unpublished for automatic enrichment.
update public.anime
set is_published = true,
    updated_at = now()
where source = 'wikidata'
  and source_id ~ '^Q[1-9][0-9]*$'
  and title is not null and btrim(title) <> ''
  and title_ja is not null and btrim(title_ja) <> ''
  and release_year >= 1963
  and country_code = 'JP'
  and format in ('tv', 'movie', 'ova')
  and is_published is distinct from true;
