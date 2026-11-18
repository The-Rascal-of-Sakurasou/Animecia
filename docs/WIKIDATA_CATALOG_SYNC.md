# ANIXIA automatic catalog and metadata synchronization

## Overview

ANIXIA uses scheduled Supabase Edge Functions to collect structured anime catalog data and fill missing metadata. Synchronization is incremental and uses external source IDs to avoid duplicate records.

### Active sources

- **Wikidata (CC0):** anime work candidates, titles, format, year, country, episode count, external IDs, aliases, genres, people, characters, staff links, series and work relations.
- **Wikimedia Commons:** candidate poster images only when the file's license and attribution data can be verified.
- **Annict:** disabled until its source terms and rights review are approved.
- **TMDB:** not used by the current workflow.

## Scheduled jobs

All schedules below are UTC. Japan time is UTC+9.

| Cron job | UTC schedule | Japan time | Purpose |
|---|---:|---:|---|
| anixia-wikidata-catalog-sync | Daily 02:30 | Daily 11:30 | Discover and register new anime work candidates |
| anixia-wikidata-enrichment-sync | Daily 03:15 | Daily 12:15 | Fill structured metadata and relationships |
| anixia-seasonal-anime-sync | Daily 03:35 | Daily 12:35 | Discover and synchronize current-season works |
| anixia-wikidata-episodes-sync | Sunday 04:00 | Sunday 13:00 | Discover episode entities and add episode rows |
| anixia-commons-poster-sync | Sunday 05:00 | Sunday 14:00 | Find reusable Commons images with attribution |

The schedules are registered in Supabase Cron and use a secret retrieved from Supabase Vault at execution time. Batch sizes are deliberately bounded to reduce timeouts and respect Wikidata Query Service limits.

## Work catalog synchronization

- Edge Function: `sync-wikidata-catalog`
- Source: Wikidata structured data (CC0).
- Scope: Japanese-origin animation candidates within supported formats and date criteria.
- Imports structured work metadata and Wikidata QIDs.
- Uses `catalog_sync_state` for the incremental offset and `catalog_sync_runs` for execution history.
- Uses `upsert(..., ignoreDuplicates: true)` to avoid replacing existing rows.
- New candidates remain unpublished. Publication must be handled by the separate administrator review workflow.

## Metadata enrichment

- Edge Function: `sync-wikidata-enrichment`
- Scheduled daily with a batch limit of 50 works.
- Adds missing/source-linked external IDs, aliases, official URLs, episode counts, people, characters, staff relationships, genres, series and prequel/sequel relationships.
- Existing manual values and publication states are preserved.
- Structured data is imported only when the source provides a supported value. Missing values are left blank.
- Prose synopsis text is not copied from Wikidata. It requires a separate source with appropriate reuse rights and attribution.

## Seasonal anime synchronization

- Edge Function: `sync-seasonal-anime`.
- Scheduled daily at 03:35 UTC (12:35 Japan time).
- Finds Japanese animation works with dates in the current Japan-local season and synchronizes seasonal release metadata and available external IDs.
- This is a separate pipeline from the historical catalog sweep. Monitor duplicate matches and publication-state behavior independently.

## Episode synchronization

- Edge Function: `sync-wikidata-episodes`
- Scheduled weekly with a batch limit of 5 works per run.
- Checks published Wikidata works with a positive episode count.
- Uses episode class, `part of the series (P179)`, `part of (P361)`, season `has part(s) (P527)`, and season property `P4908` relationships where present.
- Reads Japanese/other labels, original title (`P1476`), publication date (`P577`) and series ordinal (`P1545`) when available.
- The query includes anime television series episode class (`Q102364578`) as well as the general television episode classes.
- Existing episode rows from other sources cause the work to be skipped to avoid mixing source ordering.
- Existing Wikidata episode rows are not overwritten. New rows are appended after the current display order.
- Every imported episode remains unpublished until an administrator reviews it.
- Wikidata does not provide episode data for every anime. An empty result is not proof that the work has no episodes.

## Images

- Edge Function: `sync-commons-posters`
- Uses Wikimedia Commons file metadata and records attribution/source information alongside image URLs.
- Only images with verifiable licensing/attribution are eligible.
- A failed match leaves the poster field blank; no unverified image is assigned.
- The current catalog has not yet demonstrated broad poster coverage. Image synchronization success must be measured by actual updated-row counts, not merely by the Edge Function being active.

## Rights and source policy

- Wikidata structured data is CC0.
- Wikimedia Commons files have individual license and attribution requirements; each file must be checked independently.
- Annict remains disabled pending rights review.
- No source is treated as permission to copy arbitrary synopsis prose or images.
- Source approval is checked before the corresponding synchronization runs.

## Security

- Scheduled functions authenticate with a high-entropy cron token stored in Supabase Vault.
- Only a SHA-256 hash of the token is stored in the database.
- The token is never included in browser code or committed to Git.
- Functions that set `verify_jwt: false` perform their own administrator-or-cron-token validation before accessing data.
- Synchronization secrets and state tables are not available to anonymous users.
- Keep Edge Function secrets, service-role credentials and decrypted Vault values out of logs, browser code and Git history.

## Current verification notes

- Work, metadata, episode and image jobs are registered as active Cron jobs.
- A recent metadata enrichment test processed 26 works and recorded 555 added/linked structured values.
- A later 10-work enrichment test completed successfully and found no additional missing values in that batch.
- Episode synchronization has successfully imported 2 Wikidata episode rows. Both remain unpublished for review. Other tested works returned no matching episode entities.
- Poster URL coverage is currently 0 in the inspected anime table. The image job is active, but broad image coverage is not yet verified.
- The latest catalog table count observed during development was 313 anime rows. Counts change as synchronization continues.

## Known limitations and next steps

- Wikidata is community-maintained and may be incomplete or inconsistent.
- Query Service requests are subject to a 60-second query deadline, rate limits and concurrency restrictions. Requests must use a descriptive User-Agent, stay sequential/bounded, and honor `Retry-After` on HTTP 429.
- Episode coverage remains low; improve matching against season/series relationships and validate each new query against representative anime before increasing batch sizes.
- Poster coverage requires diagnosing Commons search matching and expanding the supported search strategy without relaxing license checks.
- Synopsis, streaming availability, ratings and other prose/provider-specific fields need additional approved sources before they can be populated automatically.
- Do not auto-publish uncertain data. Keep source provenance and administrator review available for every imported record.
