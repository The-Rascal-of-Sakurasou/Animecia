import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const allowedOrigin = "https://the-rascal-of-sakurasou.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json; charset=utf-8"
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function mapWork(work: any) {
  const seasonName = typeof work.season_name === "string" ? work.season_name : "";
  const seasonParts = seasonName.match(/^(\d{4})-(winter|spring|summer|autumn)$/);
  const releasedOn = typeof work.released_on === "string" && /^\d{4}-\d{2}-\d{2}$/.test(work.released_on)
    ? work.released_on
    : null;
  const releaseYear = seasonParts
    ? Number(seasonParts[1])
    : (releasedOn ? Number(releasedOn.slice(0, 4)) : null);
  const title = String(work.title || "").trim().slice(0, 1000);
  const japaneseTitle = /[\u3000-\u30ff\u3400-\u9fff]/.test(title) ? title : null;
  const media = String(work.media || "other").toLowerCase();

  return {
    source: "annict",
    source_id: String(work.id),
    title,
    title_ja: japaneseTitle,
    title_kana: typeof work.title_kana === "string" ? work.title_kana.slice(0, 1000) : null,
    format: ["tv", "ova", "movie", "web"].includes(media) ? media : "other",
    release_year: releaseYear,
    season: seasonParts?.[2] || null,
    season_name: seasonName || null,
    season_name_text: typeof work.season_name_text === "string" ? work.season_name_text : null,
    released_on: releasedOn,
    released_on_about: typeof work.released_on_about === "string" ? work.released_on_about : null,
    media_text: typeof work.media_text === "string" ? work.media_text : null,
    episode_count: Number.isInteger(work.episodes_count) ? work.episodes_count : null,
    episodes_count: Number.isInteger(work.episodes_count) ? work.episodes_count : null,
    watchers_count: Number.isInteger(work.watchers_count) ? work.watchers_count : null,
    reviews_count: Number.isInteger(work.reviews_count) ? work.reviews_count : null,
    no_episodes: typeof work.no_episodes === "boolean" ? work.no_episodes : null,
    official_url: safeHttpUrl(work.official_site_url),
    official_site_url: safeHttpUrl(work.official_site_url),
    wikipedia_url: safeHttpUrl(work.wikipedia_url),
    twitter_username: typeof work.twitter_username === "string" ? work.twitter_username : null,
    twitter_hashtag: typeof work.twitter_hashtag === "string" ? work.twitter_hashtag : null,
    mal_anime_id: work.mal_anime_id == null ? null : String(work.mal_anime_id),
    syobocal_tid: work.syobocal_tid == null ? null : String(work.syobocal_tid),
    source_synced_at: new Date().toISOString()
    // poster_url / banner_url are intentionally omitted: Annict does not license those images.
    // is_published is intentionally omitted: new rows keep the database default (false).
    // Existing publication decisions are not overwritten by subsequent syncs.
  };
}

async function fetchAnnictPage(page: number, token: string) {
  const fields = [
    "id", "title", "title_kana", "media", "media_text", "season_name",
    "season_name_text", "released_on", "released_on_about", "official_site_url",
    "wikipedia_url", "twitter_username", "twitter_hashtag", "syobocal_tid",
    "mal_anime_id", "episodes_count", "watchers_count", "reviews_count", "no_episodes"
  ].join(",");
  const params = new URLSearchParams({
    page: String(page),
    per_page: "50",
    sort_id: "asc",
    fields
  });

  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch("https://api.annict.com/v1/works?" + params.toString(), {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
        "User-Agent": "ANIXIA/1.0 (https://the-rascal-of-sakurasou.github.io/anixia/)"
      }
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After") || response.headers.get("RateLimit-Reset") || "5");
      await wait(Math.min(120, Math.max(1, retryAfter)) * 1000);
      continue;
    }
    if ([500, 502, 503, 504].includes(response.status) && attempt < 3) {
      await wait((attempt + 1) * 2000);
      continue;
    }
    if (!response.ok) {
      const details = await response.text();
      throw new Error("Annict API returned HTTP " + response.status + ": " + details.slice(0, 300));
    }

    const payload = await response.json();
    const remaining = Number(response.headers.get("RateLimit-Remaining"));
    const reset = Number(response.headers.get("RateLimit-Reset"));
    if (Number.isFinite(remaining) && remaining <= 5 && Number.isFinite(reset) && reset > 0) {
      await wait(Math.min(120, reset + 1) * 1000);
    }
    return payload;
  }
  throw new Error("Annict API rate limit or temporary server error persisted after retries.");
}

async function persistAnnictRows(admin: any, rows: any[]) {
  const sourceIds = rows.map(row => String(row.source_id));
  const malIds = [...new Set(rows.map(row => row.mal_anime_id).filter(Boolean).map(String))];

  const [annictIdsResult, localRowsResult, malIdsResult] = await Promise.all([
    admin.from("anime_external_ids").select("external_id,anime_id")
      .eq("source", "annict").in("external_id", sourceIds),
    admin.from("anime").select("id,source_id")
      .eq("source", "annict").in("source_id", sourceIds),
    malIds.length
      ? admin.from("anime_external_ids").select("external_id,anime_id")
          .eq("source", "myanimelist").in("external_id", malIds)
      : Promise.resolve({ data: [], error: null })
  ]);
  if (annictIdsResult.error || localRowsResult.error || malIdsResult.error) {
    throw annictIdsResult.error || localRowsResult.error || malIdsResult.error;
  }

  const knownAnnict = new Map<string, string>();
  for (const row of annictIdsResult.data || []) knownAnnict.set(String(row.external_id), String(row.anime_id));
  for (const row of localRowsResult.data || []) knownAnnict.set(String(row.source_id), String(row.id));

  const malToAnime = new Map<string, string>();
  for (const row of malIdsResult.data || []) malToAnime.set(String(row.external_id), String(row.anime_id));

  const candidateTargets = [...new Set(rows
    .filter(row => !knownAnnict.has(String(row.source_id)) && row.mal_anime_id && malToAnime.has(String(row.mal_anime_id)))
    .map(row => malToAnime.get(String(row.mal_anime_id))!))];

  const occupiedResult = candidateTargets.length
    ? await admin.from("anime_external_ids").select("anime_id,external_id")
        .eq("source", "annict").in("anime_id", candidateTargets)
    : { data: [], error: null };
  if (occupiedResult.error) throw occupiedResult.error;
  const occupiedTargets = new Set((occupiedResult.data || []).map((row: any) => String(row.anime_id)));

  const linkedByMal = new Map<string, string>();
  const pending: any[] = [];
  for (const row of rows) {
    const sourceId = String(row.source_id);
    if (knownAnnict.has(sourceId)) continue;
    const malId = row.mal_anime_id == null ? "" : String(row.mal_anime_id);
    const targetId = malId ? malToAnime.get(malId) : null;
    if (targetId && !occupiedTargets.has(targetId)) {
      linkedByMal.set(sourceId, targetId);
      occupiedTargets.add(targetId);
    } else {
      pending.push(row);
    }
  }

  if (pending.length) {
    const saved = await admin.from("anime").upsert(pending, { onConflict: "source,source_id" });
    if (saved.error) throw saved.error;
  }

  const pendingIds = pending.map(row => String(row.source_id));
  const importedResult = pendingIds.length
    ? await admin.from("anime").select("id,source_id")
        .eq("source", "annict").in("source_id", pendingIds)
    : { data: [], error: null };
  if (importedResult.error) throw importedResult.error;

  const mappingBySourceId = new Map<string, string>(knownAnnict);
  for (const [sourceId, animeId] of linkedByMal) mappingBySourceId.set(sourceId, animeId);
  for (const row of importedResult.data || []) mappingBySourceId.set(String(row.source_id), String(row.id));

  const mappingRows = rows
    .map(row => {
      const sourceId = String(row.source_id);
      const animeId = mappingBySourceId.get(sourceId);
      return animeId ? {
        anime_id: animeId,
        source: "annict",
        external_id: sourceId,
        source_url: "https://annict.com/works/" + sourceId,
        is_primary: false,
        last_verified_at: new Date().toISOString()
      } : null;
    })
    .filter(Boolean);

  if (mappingRows.length) {
    const mapped = await admin.from("anime_external_ids").upsert(mappingRows, {
      onConflict: "source,external_id",
      ignoreDuplicates: true
    });
    if (mapped.error) throw mapped.error;
  }

  return {
    processed: rows.length,
    newlyCreatedOrUpdated: pending.length,
    linkedByKnownMalId: linkedByMal.size
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin && origin !== allowedOrigin) return json({ error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "管理者ログインが必要です。" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const annictToken = Deno.env.get("ANNICT_ACCESS_TOKEN");
  if (!url || !anon || !service) return json({ error: "Supabaseのサーバー設定が不足しています。" }, 500);
  if (!annictToken) return json({ error: "ANNICT_ACCESS_TOKENが未設定です。SupabaseのEdge Function Secretsに登録してください。" }, 503);

  try {
    const userClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "ログイン状態を確認できません。" }, 401);

    const { data: adminCheck, error: adminError } = await userClient.rpc("is_anixia_admin");
    if (adminError || adminCheck !== true) return json({ error: "この操作にはANIXIA管理者権限が必要です。" }, 403);

    // Fail closed: no provider request or catalog write until the source has been
    // explicitly approved and enabled by an administrator.
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: source, error: sourceError } = await admin.from("catalog_sources")
      .select("rights_review_status,is_enabled")
      .eq("code", "annict")
      .single();
    if (sourceError) {
      console.error("ANIXIA catalog source check failed:", sourceError);
      return json({ error: "データソースの利用承認状態を確認できません。同期は停止しました。" }, 503);
    }
    if (!source?.is_enabled || source.rights_review_status !== "approved") {
      return json({
        error: "Annictの利用条件確認が完了していないため、同期は停止中です。",
        rightsReviewStatus: source?.rights_review_status || "unknown",
        enabled: Boolean(source?.is_enabled)
      }, 423);
    }

    const body = await req.json().catch(() => ({}));
    const startPage = Math.min(100000, Math.max(1, Math.floor(Number(body?.startPage) || 1)));
    const maxPages = Math.min(5, Math.max(1, Math.floor(Number(body?.maxPages) || 3)));
    const mode = body?.mode === "preview" ? "preview" : "sync";

    // Preview reads exactly one provider page and checks local duplicates.
    // It never creates a sync run and never writes catalogue records.
    if (mode === "preview") {
      const payload = await fetchAnnictPage(startPage, annictToken);
      const works = Array.isArray(payload.works) ? payload.works : [];
      const validWorks = works.filter((work: any) =>
        work.id !== undefined && typeof work.title === "string" && work.title.trim()
      );
      const sourceIds = validWorks.map((work: any) => String(work.id));
      const existingResult = sourceIds.length
        ? await admin.from("anime").select("source_id,is_published")
            .eq("source", "annict").in("source_id", sourceIds)
        : { data: [], error: null };
      if (existingResult.error) throw existingResult.error;
      const existing = new Map((existingResult.data || []).map((row: any) =>
        [String(row.source_id), Boolean(row.is_published)]
      ));
      return json({
        mode: "preview",
        page: startPage,
        recordsSeen: works.length,
        totalCount: Number.isFinite(payload.total_count) ? payload.total_count : null,
        nextPage: payload.next_page == null ? null : Number(payload.next_page),
        candidates: validWorks.map((work: any) => {
          const mapped = mapWork(work);
          return {
            sourceId: mapped.source_id,
            title: mapped.title,
            titleJa: mapped.title_ja,
            titleKana: mapped.title_kana,
            sourceMedia: mapped.media_text || mapped.format,
            proposedFormat: mapped.format,
            releaseYear: mapped.release_year,
            seasonName: mapped.season_name_text || mapped.season_name,
            episodeCount: mapped.episode_count,
            officialUrl: mapped.official_url,
            alreadyImported: existing.has(mapped.source_id),
            alreadyPublished: existing.get(mapped.source_id) === true
          };
        })
      });
    }

    const runInsert = await admin.from("catalog_sync_runs").insert({
      source: "annict", status: "running", pages_requested: 0,
      records_seen: 0, records_inserted_or_updated: 0
    }).select("id").single();
    if (runInsert.error) throw runInsert.error;
    const runId = runInsert.data.id;

    let page = startPage, pagesRequested = 0, recordsSeen = 0, upserted = 0;
    let totalCount: number | null = null, nextPage: number | null = null;
    try {
      for (let i = 0; i < maxPages; i++) {
        const payload = await fetchAnnictPage(page, annictToken);
        const works = Array.isArray(payload.works) ? payload.works : [];
        totalCount = Number.isFinite(payload.total_count) ? payload.total_count : totalCount;
        pagesRequested++;
        recordsSeen += works.length;

        if (works.length) {
          const rows = works
            .filter((work: any) => work.id !== undefined && typeof work.title === "string" && work.title.trim())
            .map(mapWork);
          if (rows.length) {
            const saved = await persistAnnictRows(admin, rows);
            upserted += saved.processed;
          }
        }

        nextPage = payload.next_page == null ? null : Number(payload.next_page);
        if (nextPage == null || !Number.isFinite(nextPage)) break;
        page = nextPage;
        if (i < maxPages - 1) await wait(1100);
      }

      const done = nextPage == null;
      const update = await admin.from("catalog_sync_runs").update({
        finished_at: new Date().toISOString(),
        status: done ? "completed" : "partial",
        pages_requested: pagesRequested,
        records_seen: recordsSeen,
        records_inserted_or_updated: upserted
      }).eq("id", runId);
      if (update.error) throw update.error;
      return json({
        status: done ? "completed" : "partial",
        pagesRequested, recordsSeen, recordsInsertedOrUpdated: upserted,
        totalCount, nextPage, done
      });
    } catch (error) {
      await admin.from("catalog_sync_runs").update({
        finished_at: new Date().toISOString(),
        status: upserted > 0 ? "partial" : "failed",
        pages_requested: pagesRequested,
        records_seen: recordsSeen,
        records_inserted_or_updated: upserted,
        error_message: String(error).slice(0, 1000)
      }).eq("id", runId);
      throw error;
    }
  } catch (error) {
    console.error("ANIXIA catalog sync failed:", error);
    return json({ error: "作品データの同期に失敗しました。管理ログを確認してください。" }, 500);
  }
});
