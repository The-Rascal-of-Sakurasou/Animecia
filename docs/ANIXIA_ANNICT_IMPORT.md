# ANIXIA — Annict work detail import

Updated: 2026-11-17

## Deployed function

- Function: `sync-annict-work-details`
- Supabase project: ANIXIA
- Current deployment: active, version 3
- JWT verification: enabled
- Source file: `supabase/functions/sync-annict-work-details/index.ts`

## Purpose

Import the detailed catalogue records for one work that already exists in `public.anime`.

The function requires:
1. A valid Supabase Auth session.
2. ANIXIA administrator status (`is_anixia_admin()`).
3. An Annict source registry entry with `rights_review_status = 'approved'` and `is_enabled = true`.
4. The `ANNICT_ACCESS_TOKEN` Edge Function secret.

If the source is not approved and enabled, the function returns HTTP 423 before requesting Annict.

## Request

Call the Edge Function with a POST request and the signed-in user's Supabase session:

```ts
const { data, error } = await supabase.functions.invoke(
  "sync-annict-work-details",
  { body: { workId: "ANNICT_WORK_ID" } }
);
```

Replace `ANNICT_WORK_ID` with the numeric Annict work ID for a work already imported into ANIXIA. Do not expose the Annict access token in browser code.

## Imported data

- Episodes → `episodes`, `episode_external_ids`
- Cast people → `people`, `people_external_ids`
- Characters → `characters`, `character_external_ids`, `anime_characters`
- Character series → `series`, `series_external_ids`, `anime_series`, `characters.series_id`
- Staff people → `people`, `anime_staff`, `anime_staff_external_ids`
- Staff organizations → `organizations`, `organization_external_ids`, `anime_organization_staff`
- Organizations explicitly credited as animation production → `studios`, `studio_external_ids`, `anime_studios`
- Japanese title and kana aliases → `anime_titles`

## Safety and limits

- Only one work ID per request.
- Each endpoint is paginated at up to 50 records per page, capped at four pages per endpoint.
- Requests to episodes, casts, and staffs are sequential with a delay between endpoints.
- HTTP 429 and temporary server errors are retried with bounded waits.
- Upserts use provider IDs; cast/staff IDs are namespaced by endpoint.
- The importer does not set `is_published = true` on the work or episodes.
- The importer does not import user profiles, reviews, viewing records, or image assets.
- The importer does not yet import genres/tags, sequel/prequel relations, episode descriptions, or episode duration.
- Partial failures are recorded in `catalog_sync_runs`.

## Current status (2026-11-17)

The Edge Function is deployed and active, but no end-to-end Annict import has been performed. The `catalog_sources` row for Annict is still `pending` and disabled. All catalogue entity tables checked for this task still contain zero rows.

Annict's newly published API terms state an effective date of 2026-11-25. Before enabling production imports, review the terms again on or after that date, confirm the current rate limits and token scope, then explicitly approve and enable the source in ANIXIA. Do not bulk-import before that review.

Official references:
- https://annict.com/terms/api
- https://developers.annict.com/docs/rest-api/v1
- https://docs.annict.com/docs/ja/api/v1/casts
- https://docs.annict.com/docs/ja/api/v1/staffs
- https://docs.annict.com/docs/ja/api/v1/people
- https://docs.annict.com/docs/ja/api/v1/characters
- https://docs.annict.com/docs/ja/api/v1/organizations
- https://docs.annict.com/docs/ja/api/v1/series
