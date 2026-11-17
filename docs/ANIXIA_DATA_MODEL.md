# ANIXIA Data Model

Updated: 2026-11-17

## Design goals

- Keep ANIXIA UUIDs as internal primary keys.
- Keep provider IDs in separate cross-reference tables and source/source_id columns for idempotent imports.
- Never identify works only by title; titles can be shared, revised, localized, or reused by remakes.
- Keep provider-specific IDs and source URLs separate from public descriptions.
- Separate a work, its episodes, people, characters, studios, organizations, and series.
- Publish only reviewed records. Imported records remain unpublished until an administrator approves them.
- Do not store or redistribute third-party images unless the image rights allow it.

## Main entity relationships

- `anime` is the main work record.
- `anime_titles` stores alternate titles and language/type metadata.
- `episodes` belongs to one anime work.
- `people` stores staff and performers.
- `characters` stores fictional characters.
- `anime_staff` links a work, person, role, and optional character (use for staff and voice cast).
- `studios` stores animation studios.
- `anime_studios` supports multiple studios and production roles for one work.
- `organizations` stores non-studio organizations credited on a work.
- `anime_organization_staff` links organizations to works with their credited role.
- `series` and `anime_series` group works into franchises or series.
- `anime_relations` records directed work-to-work relations such as prequel, sequel, side story, spin-off, alternate version, summary, and adaptation.
- `*_external_ids` tables preserve source cross-references without replacing ANIXIA IDs.
- `catalog_sources` records data-source identity and rights review state.

## Annict API field mapping

Official API documentation:
- Overview: https://developers.annict.com/docs/rest-api/v1
- Works: https://docs.annict.com/docs/ja/api/v1/works
- Episodes: https://docs.annict.com/docs/ja/api/v1/episodes
- Casts: https://docs.annict.com/docs/ja/api/v1/casts
- Staffs: https://docs.annict.com/docs/ja/api/v1/staffs
- People: https://docs.annict.com/docs/ja/api/v1/people
- Characters: https://docs.annict.com/docs/ja/api/v1/characters
- Organizations: https://docs.annict.com/docs/ja/api/v1/organizations
- Series: https://docs.annict.com/docs/ja/api/v1/series

| Annict endpoint | Annict fields | ANIXIA destination |
|---|---|---|
| `GET /v1/works` | id, title, title_kana, media, media_text, season_name, released_on, official_site_url, wikipedia_url, episodes_count, no_episodes | `anime`, `anime_external_ids`, `anime_titles` |
| `GET /v1/episodes` | id, number, number_text, sort_number, title, work.id | `episodes`, `episode_external_ids` |
| `GET /v1/casts` | id, name, sort_number, work, character, person | `people`, `characters`, `anime_staff`, `anime_staff_external_ids` |
| `GET /v1/staffs` | id, name, role_text, role_other, sort_number, work, person or organization | `people`, `organizations`, `anime_staff`, `anime_organization_staff` |
| `GET /v1/people` | id, name, name_kana, name_en, nickname, url, wikipedia_url, birthday | `people`, `people_external_ids` |
| `GET /v1/characters` | id, name, name_kana, name_en, nickname, description, series | `characters`, `character_external_ids`, `series` |
| `GET /v1/organizations` | id, name, name_kana, name_en, url, wikipedia_url | `organizations`, `organization_external_ids` |
| `GET /v1/series` | id, name, name_ro, name_en | `series`, `series_external_ids` |

The mapping is a design reference, not a statement that all fields have been fully validated. The deployed `sync-annict-catalog` function imports work-level catalogue fields. A separate `sync-annict-work-details` Edge Function is also deployed and implements per-work detail synchronization for episodes, cast/staff, characters, organizations, and series. The detail importer requires an authenticated ANIXIA administrator and an explicitly approved/enabled catalogue source before fetching provider data. No production catalogue import or populated-record end-to-end validation has yet been completed; keep the Annict source disabled until its terms and operational checks are satisfied.

## Publication and rights workflow

1. Import a record as unpublished.
2. Save its provider ID and source URL.
3. Validate required fields and foreign-key relationships.
4. Detect duplicate records using provider IDs first; title matching is only a review aid.
5. Review source terms, attribution, and image rights.
6. Publish only after an administrator approves the record.
7. Periodically refresh source metadata and process source corrections, merges, and deletions.

## Annict-specific safeguards

- API terms dated 2026-10-25 take effect on 2026-11-25. Re-check the Japanese original and current rate limits before enabling production imports.
- Retrieved work information may be stored for the application, but must not be exposed as a bulk downloadable dataset or public API that lets third parties extract the provider's data.
- Do not publish bulk source data in this public GitHub repository.
- Do not redistribute, modify, or package Annict image assets as a dataset. Image rights belong to the relevant rights holders.
- Do not import Annict user profiles, reviews, records, or other user information as ANIXIA catalogue content.
- `catalog_sources` currently keeps Annict in `pending` / disabled state until the rights and operating checks are completed.

## Search and indexing

- Use exact source IDs for identity and upsert.
- Use title aliases for multilingual lookup.
- Index foreign keys and common catalogue filters.
- Keep the existing anime list RPC and front-end API stable while new relationships are introduced.
- Japanese full-text search needs separate evaluation; a generic English text-search configuration is not sufficient for Japanese tokenization.
