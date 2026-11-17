-- Remove inherited anonymous write grants from catalogue tables.
-- RLS remains the row-level authorization layer; table privileges are also least-privilege.
revoke insert, update, delete, truncate, references, trigger on table
  public.genres,
  public.tags,
  public.anime_genres,
  public.anime_tags,
  public.anime_relations,
  public.anime_titles,
  public.episodes,
  public.anime_studios,
  public.anime_series,
  public.anime_organization_staff,
  public.series,
  public.organizations
from anon;
