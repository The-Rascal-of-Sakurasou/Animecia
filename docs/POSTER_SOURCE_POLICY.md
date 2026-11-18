# ANIXIA Poster Image Source Policy

## Objective
Improve anime poster coverage without bulk copying data from sources whose terms restrict persistent catalog use or competing database services.

## Current baseline
- The existing `sync-commons-posters` Edge Function uses Wikidata and Wikimedia Commons.
- Its current license gate accepts CC0 and Public Domain only. Attribution-requiring licenses are rejected because the UI has not been confirmed to provide universal attribution display.
- AniList is recorded in `catalog_sources` as disabled and pending review. Its terms prohibit mass collection and use in competing services of the same nature, so it is not approved for bulk or persistent poster synchronization without explicit permission.

## Approved workflow
1. Prefer an exact Wikidata item match (P18) and verify image metadata on Commons.
2. Use Commons search/category fallbacks only when the match is sufficiently strong; do not infer identity from filename alone.
3. Accept only images with a verified license that ANIXIA can satisfy. Keep the current CC0/Public Domain gate until attribution UI and compliance review are implemented.
4. Save source page, attribution, license and license URL with the image.
5. Never overwrite a manually reviewed or existing poster automatically.
6. Record misses and retry them with bounded, rate-limited jobs.
7. Maintain a review queue for ambiguous matches rather than assigning them automatically.

## Candidate source review
- AniList: disabled pending review. Do not bulk collect, persist, or use for ongoing competitor catalog synchronization unless explicit permission or terms change.
- Jikan/MAL-derived sources, Kitsu, and other catalog APIs: not approved solely because endpoints are public or free. Review their current terms, image rights, retention limits and competitive-service restrictions first.
- Official production/distributor websites: evaluate on a case-by-case basis; official hosting does not itself establish reuse permission.
- Wikimedia Commons: continue as the automated primary source under the existing license gate.

## Implementation checklist
- [ ] Audit and test matching precision on a sample of entries.
- [ ] Confirm the site-wide attribution UI before enabling CC-BY/CC-BY-SA.
- [ ] Add metrics for coverage, match confidence, license rejection and API errors.
- [ ] Run bounded sync batches and verify results after each batch.
- [ ] Add periodic retries for missing posters, with rate limits and backoff.
