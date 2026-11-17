-- Enforce the minimum autocomplete query length at the public RPC boundary.
-- The browser also waits for two characters, but the database must enforce this itself.

create or replace function public.suggest_public_catalog(
  p_query text,
  p_type text default 'all',
  p_limit integer default 10
)
returns table (
  suggestion_type text,
  suggestion_id uuid,
  label text,
  detail text
)
language plpgsql
stable
security invoker
set search_path = ''
as $function$
begin
  if char_length(trim(coalesce(p_query, ''))) < 2 then
    return;
  end if;

  return query
  select *
  from private.suggest_public_catalog(p_query, p_type, p_limit);
end;
$function$;

revoke all on function public.suggest_public_catalog(text, text, integer) from public;
grant execute on function public.suggest_public_catalog(text, text, integer) to anon, authenticated;
