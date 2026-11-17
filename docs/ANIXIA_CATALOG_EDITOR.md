# ANIXIA Catalog Curation

Updated: 2026-11-17

## Admin access

Open `admin.html` after signing in with an ANIXIA administrator account. The page checks the signed-in user through the server-side `is_anixia_admin()` RPC. Non-admin users cannot access the management functions through the database policies.

## Metadata editor

1. Select the anime work.
2. Choose one or more genres and tags. Use genres for broad classifications and tags for more specific themes or attributes.
3. Select `ジャンル・タグを保存`.
4. To add a new dictionary entry, enter its Japanese display name and use the genre or tag add button. The new item is added to the dictionary; select it on the work and save the assignment separately.

The assignment is saved by `admin_replace_anime_taxonomy` in a single database transaction. It checks administrator permissions, verifies the work and all supplied genre/tag IDs, and then replaces the existing associations.

## Related works

Select a work, select a second work, choose the relation type, and save. Available relation types include sequel, prequel, side story, spin-off, alternative version/remake, summary, parent story, adaptation, and other.

Relations are directional. Add the appropriate reciprocal relation separately only when it is factually appropriate. The public detail endpoint shows both outgoing and incoming links between published works.

## Data quality checklist

The admin page flags missing title, format, release year, synopsis, official website URL, and genre assignment for unpublished works. These flags are a review aid, not an automatic publish decision. Confirm source accuracy, Japanese-original-work eligibility, supported format, age/content scope, and rights before publication.

## Public detail page

The public detail RPC returns:
- Genres and tags
- Alternate titles
- Published episodes only
- Series membership
- Studios and production organizations
- Related works, filtered to published works
- Existing character, staff, and published review information

Episodes imported from Annict remain unpublished by default. They do not appear on public detail pages until separately reviewed and published.

## Current verification limits

The schema, grants, and RLS policies have been checked. At the time of implementation, the catalogue tables checked contained no populated anime records. Therefore, end-to-end verification with actual works, browser interaction, and visual review still need to be performed once approved source data is available.
