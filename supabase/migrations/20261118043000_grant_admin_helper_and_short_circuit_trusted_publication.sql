GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_anixia_admin() TO authenticated, service_role;

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

  IF NEW.is_published IS TRUE
     AND (TG_OP = 'INSERT' OR OLD.is_published IS DISTINCT FROM TRUE) THEN
    IF service_role_request AND qualified_wikidata THEN
      NULL;
    ELSIF NOT private.is_anixia_admin() THEN
      RAISE EXCEPTION 'Publishing catalog records requires administrator review.'
        USING errcode = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;