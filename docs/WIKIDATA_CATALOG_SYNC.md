# ANIXIA Wikidata catalog synchronization

## Overview
- Source: Wikidata structured data (CC0).
- Query scope: Japan-origin animation classes: anime TV series, anime film, OVA, ONA, anime short film, animated web series and anime television programs.
- A start/publication date from 1963 onward is required.
- Imports titles, format, year, Japan country code, episode count and Wikidata QID only.
- Images, banners and synopsis/prose are never imported.
- New rows remain unpublished by default. The existing ANIXIA admin review queue is the publication gate.
- Upsert uses ignoreDuplicates, so manual edits and publication decisions are not overwritten.

## Operation
- Edge Function: sync-wikidata-catalog
- Admin manual preview/sync: ANIXIA Admin → Wikidata自動作品収録.
- Supabase Cron: daily at 02:30 UTC, batch size 50.
- Offset is stored in catalog_sync_state and advanced after successful syncs.
- Each run is recorded in catalog_sync_runs.

## Security
- The Edge Function accepts either a signed-in ANIXIA administrator (checked with is_anixia_admin) or a high-entropy cron token.
- Only the SHA-256 hash is stored in catalog_sync_secrets; the original token is stored in Supabase Vault and read by the database Cron job.
- The token is not included in frontend code or Git history.
- catalog_sync_secrets and catalog_sync_state have RLS enabled and no anon/authenticated grants.

## Source limitations
Wikidata is community-maintained and may contain incomplete or incorrect classifications. A Japan country-of-origin statement and a matching class do not prove that every item meets ANIXIA's editorial inclusion policy. Review each unpublished candidate before publication. The Query Service is rate-limited; this implementation makes one bounded query per scheduled run and uses a descriptive User-Agent.
