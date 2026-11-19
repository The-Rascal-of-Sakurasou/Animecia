import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const ORIGIN = "https://the-rascal-of-sakurasou.github.io";
const HEADERS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Vary": "Origin"
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: HEADERS });
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const SEASONS: Record<string, string> = {
  WINTER: "winter",
  SPRING: "spring",
  SUMMER: "summer",
  FALL: "autumn"
};
const SEASON_JA: Record<string, string> = {
  winter: "冬",
  spring: "春",
  summer: "夏",
  autumn: "秋"
};

async function fetchAniListPage(ids: number[], page: number) {
  const query = `
    query ($ids: [Int], $page: Int) {
      Page(page: $page, perPage: 50) {
        pageInfo { hasNextPage }
        media(idMal_in: $ids, type: ANIME) {
          idMal
          format
          season
          seasonYear
          startDate { year month day }
          title { native romaji english }
        }
      }
    }`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query, variables: { ids, page } })
    });
    if (response.status === 429) {
      const retry = Number(response.headers.get("Retry-After") || "30");
      await wait(Math.min(120, Math.max(5, retry)) * 1000);
      continue;
    }
    if ([500, 502, 503, 504].includes(response.status) && attempt < 4) {
      await wait((attempt + 1) * 2000);
      continue;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.errors?.length) {
      throw new Error("AniList API error: " + String(payload.errors?.[0]?.message || response.statusText || response.status).slice(0, 250));
    }
    return payload.data?.Page || { pageInfo: { hasNextPage: false }, media: [] };
  }
  throw new Error("AniList API rate limit or temporary error persisted.");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin && origin !== ORIGIN) return json({ error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json({ error: "Supabase server configuration is incomplete." }, 500);

  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Admin login is required." }, 401);
    const userClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: auth } }
    });
    const user = await userClient.auth.getUser();
    if (user.error || !user.data.user) return json({ error: "Login could not be verified." }, 401);
    const adminCheck = await userClient.rpc("is_anixia_admin");
    if (adminCheck.error || adminCheck.data !== true) return json({ error: "ANIXIA admin permission is required." }, 403);

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const source = await admin.from("catalog_sources")
      .select("rights_review_status,is_enabled").eq("code", "anilist").single();
    if (source.error) throw source.error;
    if (!source.data.is_enabled || source.data.rights_review_status !== "approved") {
      return json({ error: "AniList source is not approved and enabled." }, 423);
    }

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "sync" ? "sync" : "preview";
    const animeResult = await admin.from("anime")
      .select("id,title,title_ja,format,release_year,season,season_name,season_name_text,released_on")
      .eq("is_published", true)
      .in("format", ["tv", "ona", "web"])
      .limit(2000);
    if (animeResult.error) throw animeResult.error;
    const animeRows = animeResult.data || [];
    const animeById = new Map(animeRows.map((row: any) => [String(row.id), row]));
    const idsResult = await admin.from("anime_external_ids")
      .select("anime_id,external_id")
      .eq("source", "myanimelist")
      .in("anime_id", animeRows.map((row: any) => String(row.id)))
      .limit(5000);
    if (idsResult.error) throw idsResult.error;

    const idToAnime = new Map<string, any>();
    const malToAnime = new Map<number, any>();
    const duplicateMalIds = new Set<number>();
    for (const mapping of idsResult.data || []) {
      const anime = animeById.get(String(mapping.anime_id));
      const malId = Number(mapping.external_id);
      if (!anime || !Number.isSafeInteger(malId) || malId <= 0) continue;
      if (malToAnime.has(malId) && malToAnime.get(malId).id !== anime.id) {
        duplicateMalIds.add(malId);
        malToAnime.delete(malId);
        continue;
      }
      if (!duplicateMalIds.has(malId)) malToAnime.set(malId, anime);
      idToAnime.set(String(anime.id), anime);
    }

    const malIds = [...malToAnime.keys()].sort((a, b) => a - b);
    const mediaByMal = new Map<number, any>();
    let pagesRequested = 0;
    for (let start = 0; start < malIds.length; start += 10000) {
      const idBatch = malIds.slice(start, start + 10000);
      let page = 1;
      while (true) {
        const result = await fetchAniListPage(idBatch, page);
        pagesRequested++;
        for (const media of result.media || []) {
          const id = Number(media.idMal);
          if (Number.isSafeInteger(id) && malToAnime.has(id)) mediaByMal.set(id, media);
        }
        if (!result.pageInfo?.hasNextPage) break;
        page++;
        if (page > 100) throw new Error("AniList pagination safety limit reached.");
        await wait(1200);
      }
    }

    const candidates: any[] = [];
    let unmatched = 0, invalidSeason = 0, formatMismatch = 0, duplicateMappings = duplicateMalIds.size;
    for (const [malId, anime] of malToAnime) {
      const media = mediaByMal.get(malId);
      if (!media) { unmatched++; continue; }
      if (!["TV", "TV_SHORT", "ONA"].includes(String(media.format || ""))) {
        formatMismatch++;
        continue;
      }
      const season = SEASONS[String(media.season || "")];
      const year = Number(media.seasonYear);
      if (!season || !Number.isInteger(year) || year < 1900 || year > 2100) {
        invalidSeason++;
        continue;
      }
      const d = media.startDate || {};
      const releasedOn = Number.isInteger(Number(d.year)) && Number.isInteger(Number(d.month)) &&
        Number.isInteger(Number(d.day)) && Number(d.month) >= 1 && Number(d.month) <= 12 &&
        Number(d.day) >= 1 && Number(d.day) <= 31
        ? String(d.year).padStart(4, "0") + "-" + String(d.month).padStart(2, "0") + "-" + String(d.day).padStart(2, "0")
        : null;
      const title = anime.title_ja || anime.title || media.title?.native || media.title?.romaji || "タイトル未登録";
      const patch = {
        release_year: year,
        season,
        season_name: year + "-" + season,
        season_name_text: year + "年" + SEASON_JA[season],
        ...(releasedOn && !anime.released_on ? { released_on: releasedOn } : {})
      };
      candidates.push({
        animeId: anime.id, title, malId, format: anime.format,
        anilistFormat: media.format, season, seasonYear: year,
        releasedOn: releasedOn || anime.released_on || null,
        alreadyClassified: Boolean(anime.season),
        changed: anime.release_year !== year || anime.season !== season ||
          anime.season_name !== patch.season_name ||
          anime.season_name_text !== patch.season_name_text ||
          (!anime.released_on && Boolean(releasedOn)),
        patch
      });
    }

    let updated = 0;
    if (mode === "sync") {
      for (let start = 0; start < candidates.length; start += 10) {
        const batch = candidates.slice(start, start + 10);
        const results = await Promise.all(batch.map((item: any) =>
          admin.from("anime").update(item.patch).eq("id", item.animeId).eq("is_published", true)
        ));
        const failed = results.find((result: any) => result.error);
        if (failed?.error) throw failed.error;
        updated += batch.filter((item: any) => item.changed).length;
        await wait(150);
      }
    }

    return json({
      mode,
      publishedSeasonalWorks: animeRows.length,
      malIdsFound: malIds.length,
      duplicateMalIds: duplicateMappings,
      aniListMatches: mediaByMal.size,
      candidates: candidates.length,
      updated: mode === "sync" ? updated : 0,
      unmatched, invalidSeason, formatMismatch, pagesRequested,
      items: candidates.slice(0, 100).map(({ patch, ...item }: any) => item)
    });
  } catch (error: any) {
    console.error("Season metadata sync failed:", error);
    return json({ error: String(error?.message || error).slice(0, 500) }, 500);
  }
});