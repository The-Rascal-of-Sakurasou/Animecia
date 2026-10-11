-- Pin search_path for catalog, profile, trigger, and genre-maintenance functions.
-- This is a security hardening change; function logic and returned data are unchanged.
ALTER FUNCTION public.enforce_anime_genre_limit() SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.touch_watch_status() SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.normalize_anime_title(text) SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.search_profiles(text, integer) SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.infer_catalog_genres(text) SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.sync_anime_season_from_start_date() SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.get_related_anime_by_shared_genres(bigint, integer) SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.anime_title_sort_key(text, text, text, text) SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.refresh_anime_title_kana() SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.romaji_to_hiragana(text) SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.enforce_restricted_anime_visibility() SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.trigger_refresh_anime_covers() SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.advance_animecia_genre_state(integer, integer) SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.anime_small_number_to_romaji(integer) SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.anime_gojuon_key(text, text, text) SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.anime_number_to_romaji(bigint) SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION anime_admin.norm_title(text) SET search_path TO anime_admin, public, extensions, pg_temp;
ALTER FUNCTION anime_admin.reclassify_by_title_batch(integer, integer) SET search_path TO anime_admin, public, extensions, pg_temp;
ALTER FUNCTION anime_admin.reclassify_genre_batch(integer, integer) SET search_path TO anime_admin, public, extensions, pg_temp;
ALTER FUNCTION anime_admin.run_next_genre_batch() SET search_path TO anime_admin, public, extensions, pg_temp;
