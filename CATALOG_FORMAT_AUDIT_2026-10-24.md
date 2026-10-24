# Animecia catalog-format audit — 2026-10-24

## Rules applied

This pass follows the previously stated catalog policy:
- Keep ordinary Japanese anime released on or after 1963-01-01 in TV, TV_SHORT, MOVIE, OVA/OAV, or ONA formats.
- Exclude SPECIAL from the public catalog, while retaining source rows.
- Exclude verified adult/explicit-sexual and preschool-targeted works.
- Exclude trailers, teasers, PV/CM/MV, advertising and product-promotion videos, previews, educational/tutorial videos, OP/ED-only compilations, picture dramas, mini-drama/bonus mini-anime, and other non-standalone extras.
- Do not exclude a title merely because its origin is unknown, and do not exclude it solely because it is flagged as visually sensitive.
- Preserve the existing genre system and source records.

## Applied changes

- Updated the public catalog view and recorded exclusion reasons in `catalog_policy_reasons`; original anime rows were not deleted.
- Removed `SPECIAL` from the client-side format options and client-side accepted formats.
- Fixed search ranking so titles beginning with the query rank ahead of incidental substring matches. For the query `86`, the two `86－エイティシックス－` entries now rank ahead of titles containing years such as 1986/2086.
- Corrected `ダークサモナーとデキている` from `TV_SHORT` to `TV` and set duration to 30 minutes, based on the official AT-X schedule's 30-minute TV slot.
- Removed clear non-standalone promotional/educational extras and the previously specified preschool-targeted franchises from the public catalog.

## Verification snapshot

- Public catalog: 8,370 records.
- SPECIAL in public catalog and SPECIAL search filter: 0.
- Records flagged `is_adult = true` in public catalog: 0.
- Records flagged `is_preschool = true` in public catalog: 0.
- Public entries matching the reviewed promotional/educational/bonus-title rules: 0.
- Search query `86`: both prefix matches rank ahead of unrelated substring matches.
- The catalog retains TV_SHORT entries that appear to be genuine short-form anime; TV_SHORT is not excluded as a format by itself.

## Remaining review limitation

The public catalog still contains 1,323 ONA entries. Of those, 888 currently have no direct source-provider field, source ID, site URL, official URL, synopsis/description, episode count, or runtime in the database. However, many still carry import provenance: 714 of these rows have verification reasons indicating automated AniList metadata import plus Japanese-title, cover-image, and genre metadata. Missing direct links/runtime alone does not prove a title is not anime, so this pass did not mass-exclude them. They remain a priority for a source-by-source review focused on whether each entry is a standalone anime rather than an advertisement, preview, or bonus clip.

The public catalog has 152 OAV entries; all have at least one source link, but 139 lack episode-count and runtime metadata. These require source-level format checks rather than automatic exclusion.

This is a conservative first cleanup of clear false positives, not a claim that every ONA/OAV entry has now been individually verified.
