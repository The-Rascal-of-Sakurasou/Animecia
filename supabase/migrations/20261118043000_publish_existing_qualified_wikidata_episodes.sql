update public.episodes e
set is_published = true,
    updated_at = now()
from public.anime a
where e.anime_id = a.id
  and e.source = 'wikidata'
  and a.source = 'wikidata'
  and a.is_published = true
  and e.title_ja is not null
  and btrim(e.title_ja) <> ''
  and e.is_published is distinct from true;