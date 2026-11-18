# ANIXIA Integration Roadmap: Animecia + AQW

## Vision
ANIXIA consolidates Animecia's catalog and personal-library capabilities with AQW's quiz and participation features.

## Pillars
1. Catalog: coverage, aliases, metadata, staff/cast/characters/genres/studios, search and discovery.
2. Personal library: watch status, episode progress, favorites, ratings and reviews.
3. Quiz: categories, difficulty, scoring, history and leaderboard; server-side validation.
4. Community: reviews, activity, rankings and profile features, with moderation and privacy controls.
5. Discovery: seasonal catalog, recommendations, related works, filters and curated lists.
6. Automation: bounded catalog synchronization, provenance, duplicate detection, retry/backoff and review queues.

## Principles
- Audit existing ANIXIA routes, schema, policies and assets before reimplementing.
- Preserve working functionality; ship small, testable changes.
- Import only data/images whose terms and provenance are documented and compatible.
- Keep secrets server-side; never expose service-role keys or admin credentials.
- Verify deployed behavior before marking work complete.

## Phases
### 0 — Audit
Inventory ANIXIA pages, tables, RLS, functions and components. Map Animecia/AQW capabilities to existing code and gaps.

### 1 — Catalog foundation
Automated catalog ingestion, stable source identifiers, deduplication, aliases, provenance and sync monitoring. Improve poster handling through approved sources.

### 2 — Animecia library
Watch status, episode progress, favorites, ratings, reviews, profile/library display and privacy checks.

### 3 — AQW quiz integration
Quiz UI, categories, difficulty, server-side answer verification, score/history and leaderboard with validation.

### 4 — Discovery and community
Recommendations, seasonal pages, related titles, curated lists and moderation tools.

### 5 — Quality and release
Responsive tests, accessibility, security/RLS review, performance, SEO, source compliance and end-to-end tests.

## Feature matrix
| Feature | Origin | Status |
|---|---|---|
| Anime catalog/search | Animecia | Audit and extend |
| Watchlist/progress | Animecia | Audit and implement gaps |
| Ratings/reviews | Animecia | Audit and implement gaps |
| Anime quizzes | AQW | Audit and integrate |
| Score/history/leaderboard | AQW | Audit and integrate |
| Recommendation/discovery | ANIXIA | Extend |
| Automated data sync | ANIXIA | Build and verify |
