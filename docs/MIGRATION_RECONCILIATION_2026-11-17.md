# ANIXIA migration reconciliation report

確認日: 2026-11-17  
対象: GitHub `main` と Supabase project `trvnxggqzlhqdhoyiliy`  
作業範囲: 読み取り専用調査とスキーマ・スナップショットの追加。既存DBの変更は行っていない。

## 1. 照合結果

- GitHub `supabase/migrations`: 66 SQL files
- Supabase applied migration history: 37 rows
- Exact version-prefix matches: 20
- Repository files without an exact applied-version match: 46
- Applied DB history rows without an exact repository-file match: 17

The 46 unmatched repository files include 36 older `20261011...` files and 10 `202611170001...` through `202611170010...` files. The older files may belong to a prior schema generation and must not be deleted without a separate dependency audit.

## 2. Applied DB entries missing from the repository

### Initial foundation (5)
- `20261117105207_initial_anixia_database`
- `20261117105225_lock_quiz_scoring_to_server`
- `20261117105352_secure_private_quiz_answer_keys`
- `20261117105543_annict_work_fields_and_sync_tracking`
- `20261117105617_move_catalog_sync_log_to_service_only_table`

### Timestamp/name drift in the catalog expansion group (11 history rows)
The repository contains files `202611170001_catalog_expansion.sql` through `202611170010_revoke_anon_catalog_writes.sql`, while the applied database records these versions:
- `20261117121720_catalog_expansion`
- `20261117121754_catalog_expansion` (second row with the same name)
- `20261117121758_metadata_relationships`
- `20261117121817_catalog_rls_visibility`
- `20261117121821_restrict_internal_catalog_privileges`
- `20261117121824_provider_identity_columns`
- `20261117121827_upsert_conflict_indexes`
- `20261117122447_catalog_taxonomy_admin`
- `20261117122629_public_anime_detail_expansion`
- `20261117122725_harden_taxonomy_rpc`
- `20261117122832_revoke_anon_catalog_writes`

The duplicate `catalog_expansion` history entries cannot safely be mapped to one repository file without checking the original SQL that produced each database version.

### Poster provenance (1)
- `20261117134449_add_tmdb_poster_provenance`

The current live `public.anime` table has poster provenance columns and comments, but the matching migration file is absent from the repository.

## 3. Recovery snapshot

A schema-only snapshot was added under `supabase/schema-snapshot/`:
- 47 tables
- 172 constraints
- 55 standalone indexes
- 69 RLS policies
- 20 application functions
- 11 custom triggers
- API-role grants and column comments

The snapshot excludes production data, Auth users, passwords, secrets, Vault contents, cron job definitions, and Supabase-managed schemas. It is a recovery reference, **not** a migration chain and must not be placed in `supabase/migrations` or applied to the live database.

## 4. Safe next steps

1. Preserve the current production database and its migration history.
2. Use the Supabase CLI against a separate local/disposable environment to capture and replay the schema snapshot. Do not run a reset or migration repair against production.
3. Recover the exact original SQL for the five foundation migrations, both catalog-expansion history entries, and the poster-provenance migration if available from an archived checkout or trusted backup.
4. Compare recovered SQL with the current live schema and the ten timestamp-shifted repository files.
5. Only after a clean replay test, decide whether to restore the original filenames, create a new baseline for a separate environment, or repair version tracking. A `migration repair` operation changes only the history table; it does not execute SQL, so it must never be used as a substitute for schema recovery.

## 5. Current status

- Production schema/data: unchanged.
- Production migration history: unchanged.
- GitHub: added the schema snapshot and this reconciliation report.
- Static SQL inventory check: completed; details in [SCHEMA_SNAPSHOT_STATIC_AUDIT_2026-11-17.md](SCHEMA_SNAPSHOT_STATIC_AUDIT_2026-11-17.md).
- PostgreSQL replay validation: not yet performed; no disposable database was created because that may incur additional cost.

---

## 6. Recheck on 2026-11-18

The inventory was refreshed against the current main branch and live Supabase migration history. Counts have changed since the original report:

- Repository migration files: **76**
- Applied Supabase migration history rows: **48**
- Exact version-prefix matches: **29**
- Repository files without an exact applied-version match: **47**
- Applied DB history rows without an exact repository-file match: **19**

The 47 repository files without exact version matches comprise:
- 36 older `20261011...` files
- 10 catalog-expansion files named `202611170001...` through `202611170010...`, whose numeric prefixes do not match the corresponding applied database versions
- 1 later file, `20261118130000_anime_duplicate_review_mal_id_match.sql`, whose migration name exists in the database history under version `20261118034611`

The 19 database history rows without exact repository-file matches comprise:
- 5 foundation migrations listed above
- 11 catalog-expansion history rows listed above (including the second `catalog_expansion` row)
- 1 poster-provenance migration listed above
- `20261118034611_anime_duplicate_review_mal_id_match`
- `20261118034935_register_wikimedia_commons_source`

Matching migration names are useful clues, not proof that SQL contents are identical. No filename was renamed and no migration history was repaired during this recheck.

## 7. Isolated snapshot replay findings

The GitHub Actions replay test was run only against a temporary, unlinked local Supabase stack. It did not connect to the production project.

- First failure: foreign-key constraints were applied before referenced primary keys. Constraint ordering was corrected in commit `05652cb679bb53cb80f140032054c581220ee4ce`.
- Second failure: the RLS policy file was applied before its helper functions. The apply order was corrected in commit `0ea0505a8ab4018ddf4aa4659663c2a0c127eabf`.
- Third failure: a 9-argument `public.search_public_anime` wrapper was defined before the 12-argument overload it calls. The two definitions were reordered in commit `9aa4ea8735062ccf529f23cefd64430776441c7e`.

The next isolated replay run is pending after the third fix. A successful run is still required before the snapshot can be called replay-validated. Even after it passes, migration-history reconciliation remains a separate task.