-- Correct public visibility checks for catalog entities linked to published anime.
-- The previous predicates compared a junction row's foreign key to its own row ID.
drop policy if exists "People linked to published anime are readable" on public.people;
create policy "People linked to published anime are readable"
on public.people
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.anime_staff s
    where s.person_id = people.id
      and private.is_published_anime(s.anime_id)
  )
);

drop policy if exists "Organizations linked to published anime are readable" on public.organizations;
create policy "Organizations linked to published anime are readable"
on public.organizations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.anime_organization_staff s
    where s.organization_id = organizations.id
      and private.is_published_anime(s.anime_id)
  )
);

drop policy if exists "Studios linked to published anime are readable" on public.studios;
create policy "Studios linked to published anime are readable"
on public.studios
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.anime_studios ast
    where ast.studio_id = studios.id
      and private.is_published_anime(ast.anime_id)
  )
  or exists (
    select 1
    from public.anime a
    where a.studio_id = studios.id
      and private.is_published_anime(a.id)
  )
);