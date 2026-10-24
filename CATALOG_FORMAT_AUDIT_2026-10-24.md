# Animecia catalog and genre audit — 2026-10-24

## OVA / ONA-only policy

The public catalog now excludes verified OVA/OAV/ONA entries unless the same normalized title exists as a TV, TV_SHORT, or MOVIE record. Source rows are retained and exclusions are recorded in `catalog_policy_reasons`.

- Public catalog: 6,948 entries.
- TV: 4,816.
- MOVIE: 2,072.
- TV_SHORT: 7.
- OAV retained due to same-title TV/movie entry: 32.
- ONA retained due to same-title TV/movie entry: 21.
- Public SPECIAL entries: 0.

The relation table `anime_relations` currently has no rows, so this pass uses exact title matching rather than assuming that different titles belong to the same franchise. This can exclude a distinct-titled OVA/ONA spin-off even if the wider franchise has a TV series; source-level franchise linking is needed to avoid that edge case.

## Genre correction

A bulk heuristic classification version, `animecia-sql-repair-v1-min3`, assigned 3–5 genres without source-backed evidence. Examples included the same `ドラマ, コメディ, 冒険` bundle on unrelated titles. To avoid presenting unsupported labels as facts:

- The prior labels are preserved in `animecia_public_genre_audit` with `needs_review`.
- The unsupported `anime_genres` relations were removed for those rows.
- `anime.genre` was cleared and the rows were marked `needs-source-reclassification-v1`.
- Original anime records were not deleted.
- Official AniList-based and manual classifications were left intact.

The live public view currently contains 3,833 entries with a non-empty genre field. The remaining unclassified entries need source-backed reclassification; blank genres are preferable to confidently displaying fabricated labels.

## Detail-page and speed work

- Fixed a script-order issue on pages that call `AnimeciaAuth.client()` synchronously while the Supabase SDK is loaded with `defer`: the SDK is preloaded in the head and executed immediately before the page's inline client initialization, after the HTML has parsed.
- Added a visible `ジャンル未確認` fallback when a detail page has no verified genre.
- Updated global performance helpers to optimize dynamically inserted images, avoid high-priority fetches for lazy images, and avoid registering the service worker on auth callback/reset pages.
- Updated the service worker cache version and prevented caching of auth callback/reset URLs or navigations carrying auth tokens.
- Updated the HTML optimizer so it preserves the preload and does not re-add the SDK race.

Browser-level Lighthouse/real-device measurements have not yet been run, so no numeric speedup is claimed.
