delete from public.anime_titles t
using public.anime a
where a.id = t.anime_id
  and a.is_published = true
  and (
    (a.title_ja = '新世紀エヴァンゲリオン' and t.title = 'Shinseiki Evangelion')
    or
    (a.title_ja = 'STEINS;GATE' and t.title in ('Steins;Gate', 'STEINS;GATE'))
  );