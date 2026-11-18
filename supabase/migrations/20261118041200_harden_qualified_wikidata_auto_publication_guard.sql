CREATE OR REPLACE FUNCTION private.enforce_admin_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  service_role_request boolean :=
    COALESCE(current_setting('request.jwt.claim.role', true) = 'service_role', false);
  qualified_wikidata boolean :=
    COALESCE(
      NEW.source = 'wikidata'
      AND NEW.source_id ~ '^Q[1-9][0-9]*$'
      AND COALESCE(btrim(NEW.title), '') <> ''
      AND COALESCE(btrim(NEW.title_ja), '') <> ''
      AND NEW.release_year >= 1963
      AND NEW.country_code = 'JP'
      AND NEW.format IN ('tv', 'movie', 'ova', 'web'),
      false
    );
BEGIN
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