# TMDB poster synchronization

## Status
- Edge Function: `sync-tmdb-posters` (deployed; source at `supabase/functions/sync-tmdb-posters/index.ts`).
- Matching: exact normalized Japanese/English title and release year within one year; ambiguous matches are skipped.
- Scope: published anime without a poster by default; up to 50 records per invocation.
- Database writes include TMDB ID, poster URL, source page, attribution notice, terms URL, and sync timestamps.
- A successful update is counted only when Supabase returns the updated anime row.
- Existing Commons sync remains the fallback and its schedule is unchanged until TMDB credentials and rights review are complete.

## Required setup before activation
1. Obtain a TMDB API Read Access Token through a TMDB developer account.
2. In Supabase Dashboard → Project Settings → Edge Functions → Secrets, add:
   - `TMDB_API_READ_ACCESS_TOKEN` = the TMDB API Read Access Token.
3. Verify the non-commercial usage status and image-display context before enabling TMDB as an active source.
4. After credentials and rights review are complete, update the daily poster cron job to call `sync-tmdb-posters` with the existing `x-anixia-cron-token` header and a batch limit (recommended: 20–30).
5. Run a small test batch, inspect every match, and then enable the daily batch.

## Important rights and attribution notes
TMDB's developer API is free for non-commercial use with attribution. TMDB requires its logo and this notice to be displayed prominently in an About/Credits section:

> This product uses the TMDB API but is not endorsed or certified by TMDB.

TMDB states that it does not claim ownership of API images. A TMDB result is therefore **not proof that the image is official studio artwork or that TMDB grants image copyright permission**. ANIXIA must not describe every TMDB poster as an official image. Preserve source links and attribution, and do not use images where the underlying rights are unclear.

Official references:
- https://developer.themoviedb.org/docs/faq
- https://developer.themoviedb.org/docs/getting-started
- https://www.themoviedb.org/api-terms-of-use

## Operational notes
- If the token is missing, the function returns HTTP 503 and does not change poster records.
- If a title or year cannot be matched confidently, the work remains without a TMDB poster.
- Existing non-empty poster URLs are not overwritten unless `force: true` is explicitly supplied.
- This integration does not download or rehost image files; it stores TMDB's poster URL and metadata.
