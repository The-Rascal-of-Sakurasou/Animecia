-- Extend the public anime detail payload with voice actors linked to each character.
-- Preserve the existing function definition and security attributes while adding one JSON field.
do $migration$
declare
  function_ddl text;
  old_fragment text := '''image_url'', c.image_url, ''description'', c.description, ''role'', ac.role';
  new_fragment text := '''image_url'', c.image_url, ''description'', c.description, ''role'', ac.role, ''voice_actors'', coalesce((
        select jsonb_agg(jsonb_build_object(
          ''id'', p.id, ''name'', p.name, ''name_ja'', p.name_ja
        ) order by p.name_ja nulls last, p.name)
        from public.anime_staff ast
        join public.people p on p.id = ast.person_id
        where ast.anime_id = ac.anime_id
          and ast.character_id = c.id
          and ast.role = ''voice_actor''
      ), ''[]''::jsonb)';
begin
  select pg_get_functiondef('public.get_public_anime_detail(uuid)'::regprocedure)
    into function_ddl;

  if position(old_fragment in function_ddl) = 0 then
    raise exception 'Expected character JSON fragment was not found; refusing to modify get_public_anime_detail';
  end if;

  function_ddl := replace(function_ddl, old_fragment, new_fragment);
  execute function_ddl;
end
$migration$;
