-- Remove unnecessary anonymous table privileges from internal source metadata.
revoke all on public.anime_external_ids,
  public.episode_external_ids,
  public.people_external_ids,
  public.character_external_ids,
  public.studio_external_ids,
  public.series_external_ids,
  public.organization_external_ids,
  public.anime_staff_external_ids,
  public.catalog_sources
from anon;
