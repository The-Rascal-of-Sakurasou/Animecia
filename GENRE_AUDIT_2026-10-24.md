# Animecia genre audit — 2026-10-24

## Confirmed mapping defect

The database's `expand_catalog_genres` function mapped AniList's `Supernatural` genre to `ファンタジー` and did not map `Psychological`. That is not a valid one-to-one translation: supernatural and fantasy are different genre labels, and psychological must not silently disappear. The mapping now preserves them as `超自然` and `心理`.

The `anime_genres_max_five` trigger also deleted genres beyond five. That dropped a valid sixth genre from the TV series `青春ブタ野郎はバニーガール先輩の夢を見ない`. The cap has been raised to eight so source-backed genre sets are not silently truncated.

## Source-backed corrections applied

| Work | Corrected genres |
|---|---|
| 青春ブタ野郎はバニーガール先輩の夢を見ない | コメディ、ドラマ、推理、恋愛、超自然、心理 |
| 青春ブタ野郎はゆめみる少女の夢を見ない | ドラマ、恋愛、超自然 |
| 青春ブタ野郎はランドセルガールの夢を見ない | ドラマ、心理、恋愛、超自然 |
| 青春ブタ野郎はおでかけシスターの夢を見ない | ドラマ、恋愛、超自然 |
| 青春ブタ野郎はサンタクロースの夢を見ない | ドラマ、推理、心理、恋愛、超自然 |
| 青春ブタ野郎はディアフレンドの夢を見ない | ドラマ、心理、恋愛、超自然 |

Cross-checks: [Bunny Girl Senpai](https://theanimelist.net/anime/seishun-buta-yarou-wa-bunny-girl-senpai-no-yume-wo-minai), [Dreaming Girl](https://theanimelist.net/anime/seishun-buta-yarou-wa-yumemiru-shoujo-no-yume-wo-minai), [Knapsack Kid (AniList)](https://anilist.co/anime/161474/), [Sister Venturing Out](https://theanimelist.net/anime/seishun-buta-yarou-wa-odekake-sister-no-yume-wo-minai), [Santa Claus (AniList)](https://anilist.co/anime/171046/), and [Dear Friend (AniList)](https://anilist.co/anime/199340/).

## Other cleanup

- Removed the unsupported `animecia-sql-repair-v1-min3` genre labels from the public data; original values are retained in `animecia_public_genre_audit` with `needs_review`.
- Source records were not deleted.
- The public catalog currently has 6,948 entries, with 3,833 entries carrying a non-empty genre field.

## Remaining work

This is a verified correction of a systemic mapping bug and six source-checked works, not a claim that every remaining genre assignment has been re-fetched and audited. Other source-backed rows created before this mapping fix may still have `超自然` represented as `ファンタジー`. Those need a source-data refresh or individual source check before a blanket correction is safe.
