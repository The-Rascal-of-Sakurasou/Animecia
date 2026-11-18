CREATE OR REPLACE FUNCTION private.enforce_admin_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  service_role_request boolean :=
    COALESCE(current_user = 'service_role', false)
    OR COALESCE(current_setting('role', true) = 'service_role', false)
    OR COALESCE(current_setting('request.jwt.claim.role', true) = 'service_role', false);
  qualified_wikidata boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'anime' THEN
    qualified_wikidata := COALESCE(
      NEW.source = 'wikidata'
      AND NEW.source_id ~ '^Q[1-9][0-9]*$'
      AND COALESCE(btrim(NEW.title), '') <> ''
      AND COALESCE(btrim(NEW.title_ja), '') <> ''
      AND NEW.release_year >= 1963
      AND NEW.country_code = 'JP'
      AND NEW.format IN ('tv', 'movie', 'ova', 'ona', 'web'),
      false
    );
  ELSIF TG_TABLE_NAME = 'episodes' THEN
    qualified_wikidata := COALESCE(
      NEW.source = 'wikidata'
      AND NEW.source_id ~ '^Q[1-9][0-9]*$'
      AND COALESCE(btrim(NEW.title), '') <> ''
      AND COALESCE(btrim(NEW.title_ja), '') <> ''
      AND EXISTS (
        SELECT 1 FROM public.anime a
        WHERE a.id = NEW.anime_id
          AND a.source = 'wikidata'
          AND a.is_published = true
      ),
      false
    );
  END IF;

  IF NEW.is_published IS TRUE THEN
    IF TG_OP = 'INSERT' THEN
      IF NOT private.is_anixia_admin()
         AND NOT (service_role_request AND qualified_wikidata) THEN
        RAISE EXCEPTION 'Publishing catalog records requires administrator review.'
          USING errcode = '42501';
      END IF;
    ELSIF OLD.is_published IS DISTINCT FROM TRUE THEN
      IF NOT private.is_anixia_admin()
         AND NOT (service_role_request AND qualified_wikidata) THEN
        RAISE EXCEPTION 'Publishing catalog records requires administrator review.'
          USING errcode = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Publish ONA and episode records only when their Japanese titles and parent
-- work satisfy the automatic publication requirements.
SELECT set_config('request.jwt.claim.role', 'service_role', true);

UPDATE public.anime
SET is_published = true
WHERE source = 'wikidata'
  AND source_id ~ '^Q[1-9][0-9]*$'
  AND title IS NOT NULL AND btrim(title) <> ''
  AND title_ja IS NOT NULL AND btrim(title_ja) <> ''
  AND release_year >= 1963
  AND country_code = 'JP'
  AND format IN ('tv', 'movie', 'ova', 'ona', 'web')
  AND is_published IS DISTINCT FROM true;

UPDATE public.episodes e
SET is_published = true
FROM public.anime a
WHERE e.anime_id = a.id
  AND e.source = 'wikidata'
  AND e.source_id ~ '^Q[1-9][0-9]*$'
  AND e.title IS NOT NULL AND btrim(e.title) <> ''
  AND e.title_ja IS NOT NULL AND btrim(e.title_ja) <> ''
  AND a.source = 'wikidata'
  AND a.is_published = true
  AND e.is_published IS DISTINCT FROM true;