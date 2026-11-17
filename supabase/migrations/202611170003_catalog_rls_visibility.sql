-- Restrict shared catalogue dictionaries and relation rows to published works.
-- Admins retain access to unpublished candidates through explicit policies.

drop policy if exists "People are readable" on public.people;
create policy "People linked to published anime are readable" on public.people
for select to anon, authenticated
using (exists (
  select 1 from public.anime_staff s
  where s.person_id = id and private.is_published_anime(s.anime_id)
));

drop policy if exists "ANIXIA admins read all people" on public.people;
create policy "ANIXIA admins read all people" on public.people
for select to authenticated using (private.is_anixia_admin());

drop policy if exists "Characters are readable" on public.characters;
create policy "Characters linked to published anime are readable" on public.characters
for select to anon, authenticated
using (exists (
  select 1 from public.anime_characters ac
  where ac.character_id = id and private.is_published_anime(ac.anime_id)
));

drop policy if exists "ANIXIA admins read all characters" on public.characters;
create policy "ANIXIA admins read all characters" on public.characters
for select to authenticated using (private.is_anixia_admin());

drop policy if exists "Genres are readable" on public.genres;
create policy "Genres linked to published anime are readable" on public.genres
for select to anon, authenticated
using (exists (
  select 1 from public.anime_genres ag
  where ag.genre_id = id and private.is_published_anime(ag.anime_id)
));

drop policy if exists "ANIXIA admins read all genres" on public.genres;
create policy "ANIXIA admins read all genres" on public.genres
for select to authenticated using (private.is_anixia_admin());

drop policy if exists "Tags are readable" on public.tags;
create policy "Tags linked to published anime are readable" on public.tags
for select to anon, authenticated
using (exists (
  select 1 from public.anime_tags atg
  where atg.tag_id = id and private.is_published_anime(atg.anime_id)
));

drop policy if exists "ANIXIA admins read all tags" on public.tags;
create policy "ANIXIA admins read all tags" on public.tags
for select to authenticated using (private.is_anixia_admin());

drop policy if exists "Published studios are readable" on public.studios;
create policy "Studios linked to published anime are readable" on public.studios
for select to anon, authenticated
using (
  exists (
    select 1 from public.anime_studios ast
    where ast.studio_id = id and private.is_published_anime(ast.anime_id)
  )
  or exists (
    select 1 from public.anime a
    where a.studio_id = id and private.is_published_anime(a.id)
  )
);

drop policy if exists "ANIXIA admins read all studios" on public.studios;
create policy "ANIXIA admins read all studios" on public.studios
for select to authenticated using (private.is_anixia_admin());

-- Admins can inspect unpublished relationship rows while preparing catalogue entries.
drop policy if exists "ANIXIA admins read all anime staff" on public.anime_staff;
create policy "ANIXIA admins read all anime staff" on public.anime_staff
for select to authenticated using (private.is_anixia_admin());

drop policy if exists "ANIXIA admins read all anime characters" on public.anime_characters;
create policy "ANIXIA admins read all anime characters" on public.anime_characters
for select to authenticated using (private.is_anixia_admin());

drop policy if exists "ANIXIA admins read all anime genres" on public.anime_genres;
create policy "ANIXIA admins read all anime genres" on public.anime_genres
for select to authenticated using (private.is_anixia_admin());

drop policy if exists "ANIXIA admins read all anime tags" on public.anime_tags;
create policy "ANIXIA admins read all anime tags" on public.anime_tags
for select to authenticated using (private.is_anixia_admin());
