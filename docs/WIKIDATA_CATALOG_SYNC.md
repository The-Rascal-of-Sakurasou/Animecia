# ANIXIA Wikidata catalog synchronization

## Overview
- Source: Wikidata structured data (CC0).
- Query scope: Japan-origin animation classes: anime TV series, anime film, OVA, ONA, anime short film, animated web series and anime television programs.
- A start/publication date from 1963 onward is required.
- Imports titles, format, year, Japan country code, episode count and Wikidata QID only.
- Images, banners and synopsis/prose are never imported.
- New rows remain unpublished by default. The existing ANIXIA admin review queue is the publication gate.
- Upsert uses ignoreDuplicates to preserve existing metadata. A separate qualification step automatically publishes every imported Wikidata record that meets the catalog gate; it does not rewrite titles, descriptions or other user metadata.

## Operation
- Edge Function: sync-wikidata-catalog
- Admin manual preview/sync: ANIXIA Admin → Wikidata自動作品収録.
- Supabase Cron: daily at 02:30 UTC (11:30 Japan time), batch size 50.
- Offset is stored in catalog_sync_state and advanced after successful syncs.
- Each run is recorded in catalog_sync_runs.
- The first two test batches scanned 20 source rows and imported 17 new records. The database now contains 26 Wikidata-sourced rows: 17 unpublished candidates and 9 published records.

## First-time secret provisioning
The original cron token must never be committed to Git or placed in browser code. Generate it inside Postgres, store it in Supabase Vault, and store only its SHA-256 hash in catalog_sync_secrets:

```sql
do $$
declare
  sync_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  perform vault.create_secret(
    sync_token,
    'anixia_wikidata_sync_token',
    'Private token for scheduled ANIXIA Wikidata catalog synchronization'
  );
  insert into public.catalog_sync_secrets (id, secret_hash)
  values (1, encode(extensions.digest(sync_token, 'sha256'), 'hex'))
  on conflict (id) do update
    set secret_hash = excluded.secret_hash, updated_at = now();
end $$;
```

The Cron job reads the secret from vault.decrypted_secrets at runtime and sends it in the x-anixia-cron-token header. Do not display or export the decrypted value.

## Security
- The Edge Function accepts either a signed-in ANIXIA administrator (checked with is_anixia_admin) or the high-entropy cron token.
- Only the SHA-256 hash is stored in catalog_sync_secrets; the original token is stored in Supabase Vault.
- The token is not included in frontend code or Git history.
- catalog_sync_secrets and catalog_sync_state have RLS enabled and no anon/authenticated grants.
- Gateway JWT verification is disabled for this one function because it supports the separate private cron-token authentication path; all requests are then checked by the function itself.

## Source limitations
Wikidata is community-maintained and may contain incomplete or incorrect classifications. Automatic publication is limited to records with a Japanese title, a valid QID, a release year from 1963 onward, Japan as country of origin, and a supported format (TV, movie, OVA or ONA/web). Records missing a Japanese title remain unpublished rather than requiring a manual approval step. The Query Service is rate-limited; this implementation makes one bounded query per scheduled run and uses a descriptive User-Agent.

## Episode synchronization

- Edge Function: `sync-wikidata-episodes` (JWT verification enabled; administrator role is checked inside the function).
- Admin manual preview/import: ANIXIA Admin → Wikidataエピソード自動収録.
- The importer checks published Wikidata anime works with a positive episode count and imports episode entities connected through `part of (P361)` and season `has part(s) (P527)` statements.
- It reads episode labels, Japanese labels, original Japanese titles (`P1476`), publication dates (`P577`) and series ordinals (`P1545`) when present.
- Imported episode rows are always unpublished. The admin episode-review queue remains the publication gate.
- Existing episode records from other sources cause that work to be skipped, avoiding mixed-source ordering conflicts.
- Existing Wikidata episode rows are not overwritten. Newly discovered rows are appended after the existing display order.
- The public detail page does not infer an episode number from display order. If the source has no ordinal, it shows that the episode number is unregistered.
- Wikidata episode coverage is incomplete and may omit many episodes. Missing source data is not treated as evidence that an episode does not exist.
- The Wikidata Query Service is rate-limited; requests are sequential and include a descriptive User-Agent.

### Episode field limitations

The Annict REST API episode endpoint documents episode ID, number, display number, sort number, title and related work/episode references. It does not document per-episode broadcast date or duration fields. ANIXIA therefore leaves those fields blank unless another source provides a verifiable value. See the [Annict episode API specification](https://docs.annict.com/docs/ja/api/v1/episodes).
