# Detail-page and taxonomy follow-up — 2026-10-24

## Detail page audit

The detail page loads the base work first, then requests genres, studios, characters, staff, streaming links, related works, reviews, episodes, tags and source links. RLS SELECT policies exist for the inspected public detail tables; empty optional sections are not caused by missing public SELECT policies.

Current database counts:
- `anime_studios`: 10,773 links; `studios`: 902 rows.
- `anime_characters`, `characters`, `anime_staff`, `staff`, `anime_episodes`, `anime_sources`, and `anime_streaming_links`: 0 rows each.
- Public catalog: 6,948 works; missing synopsis/description: 6,905; missing episodes: 2,660; missing duration: 4,498; missing genre: 3,115; missing source-provider ID: 2,838.

The detail-page code can load the base record, but it cannot display characters, staff, episode data, or streaming links until reliable records are imported into those tables. No episode names or summaries should be invented. A dedicated source-backed detail import remains required.

## Genre taxonomy maintenance

- Added `超自然` and `心理` to source-backed genre mapping.
- Removed incorrect `Supernatural -> ファンタジー` and `Psychological -> サスペンス` substitutions from automated mapping paths.
- Updated the genre-resync classifier's canonical IDs to include both labels.
- Unsupported bulk genre assignments remain quarantined for source review.

## Performance

The shared performance helper is present on generated SEO pages and key site pages. It preconnects to required origins, optimizes dynamically inserted images, prioritizes only above-the-fold images and uses versioned static caching. The optimizer workflow scans HTML files recursively, so regenerated anime pages receive the same optimization. A browser/Lighthouse run has not been performed; no numerical speedup is claimed.
