-- Synopsis and poster provenance fields; Wikipedia prose remains disabled.
ALTER TABLE public.anime
  ADD COLUMN IF NOT EXISTS synopsis_source text,
  ADD COLUMN IF NOT EXISTS synopsis_source_title text,
  ADD COLUMN IF NOT EXISTS synopsis_source_url text,
  ADD COLUMN IF NOT EXISTS synopsis_source_revision_id bigint,
  ADD COLUMN IF NOT EXISTS synopsis_source_revision_url text,
  ADD COLUMN IF NOT EXISTS synopsis_license text,
  ADD COLUMN IF NOT EXISTS synopsis_license_url text,
  ADD COLUMN IF NOT EXISTS synopsis_attribution text,
  ADD COLUMN IF NOT EXISTS synopsis_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS synopsis_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS poster_license text,
  ADD COLUMN IF NOT EXISTS poster_license_url text;

CREATE INDEX IF NOT EXISTS anime_synopsis_pending_idx
ON public.anime (synopsis_attempted_at NULLS FIRST, release_year DESC NULLS LAST)
WHERE is_published = true AND synopsis IS NULL;

INSERT INTO public.catalog_sources
  (code, display_name, website_url, api_docs_url, terms_url, rights_review_status, rights_notes, is_enabled)
VALUES
  ('japanese_wikipedia', 'Japanese Wikipedia', 'https://ja.wikipedia.org/',
   'https://www.mediawiki.org/wiki/API:REST_API/Reference/ja',
   'https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use',
   'pending',
   'Article prose extraction is disabled. ANIXIA does not copy Wikipedia article text; only non-prose structured metadata from approved sources is used.',
   false)
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
  definition text;
BEGIN
  definition := pg_get_functiondef('public.get_public_anime_detail(uuid)'::regprocedure);
  definition := replace(
    definition,
    $needle
  EXECUTE definition;
END $$;
synopsis', a.synopsis, 'synopsis_en', a.synopsis_en,$needle$,
    $replacement
  EXECUTE definition;
END $$;
synopsis', a.synopsis, 'synopsis_en', a.synopsis_en,
    'synopsis_credit', jsonb_build_object(
      'source', a.synopsis_source,
      'source_title', a.synopsis_source_title,
      'source_url', a.synopsis_source_url,
      'revision_id', a.synopsis_source_revision_id,
      'revision_url', a.synopsis_source_revision_url,
      'license', a.synopsis_license,
      'license_url', a.synopsis_license_url,
      'attribution', a.synopsis_attribution,
      'synced_at', a.synopsis_synced_at
    ),$replacement$
  );
  definition := replace(
    definition,
    $posterNeedle
  EXECUTE definition;
END $$;
poster_url', a.poster_url, 'banner_url', a.banner_url,$posterNeedle$,
    $posterReplacement
  EXECUTE definition;
END $$;
poster_url', a.poster_url,
    'poster_credit', jsonb_build_object(
      'source', a.poster_source,
      'source_id', a.poster_source_id,
      'source_url', a.poster_source_url,
      'attribution', a.poster_attribution,
      'license', a.poster_license,
      'license_url', a.poster_license_url
    ),
    'banner_url', a.banner_url,$posterReplacement$
  );
  IF position('synopsis_credit' in definition) = 0 OR position('poster_credit' in definition) = 0 THEN
    RAISE EXCEPTION 'Could not safely extend public anime detail response';
  END IF;
  EXECUTE definition;
END $$;
