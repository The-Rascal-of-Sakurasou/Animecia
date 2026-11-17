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
- Supabase Cron: daily at 02:30 UTC (11:30 Japan time), batch size 50.
- Offset is stored in catalog_sync_state and advanced after successful syncs.
- Each run is recorded in catalog_sync_runs.
- The first two test batches completed: 20 candidates imported; 17 Wikidata-sourced rows are currently unpublished, and 9 remain published. (The 17 unpublished total includes imported candidates.)

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
Wikidata is community-maintained and may contain incomplete or incorrect classifications. A Japan country-of-origin statement and a matching class do not prove that every item meets ANIXIA's editorial inclusion policy. Review each unpublished candidate before publication. The Query Service is rate-limited; this implementation makes one bounded query per scheduled run and uses a descriptive User-Agent.
