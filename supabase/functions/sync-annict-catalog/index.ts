import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

function mapWork(work: any) {
  const seasonParts = String(work.season_name || "").match(/^(\d{4})-(winter|spring|summer|autumn)$/);
  const releaseYear = seasonParts ? Number(seasonParts[1]) :
    (work.released_on && /^\d{4}/.test(work.released_on) ? Number(work.released_on.slice(0, 4)) : null);
  const title = String(work.title || "").trim();
  const japaneseTitle = /[\u3000-\u30ff\u3400-\u9fff]/.test(title) ? title : null;
  const media = String(work.media || "other").toLowerCase();
  return {
    source: "annict",
    source_id: String(work.id),
    title,
    title_ja: japaneseTitle,
    title_kana: work.title_kana || null,
    format: ["tv", "ova", "movie", "web"].includes(media) ? media : "other",
    release_year: releaseYear,
    season: seasonParts?.[2] || null,
    season_name: work.season_name || null,
    season_name_text: work.season_name_text || null,
    released_on: work.released_on || null,
    released_on_about: work.released_on_about || null,
    media_text: work.media_text || null,
    episode_count: work.episodes_count ?? null,
    episodes_count: work.episodes_count ?? null,
    watchers_count: work.watchers_count ?? null,
    reviews_count: work.reviews_count ?? null,
    no_episodes: work.no_episodes ?? null,
    official_url: work.official_site_url || null,
    official_site_url: work.official_site_url || null,
    wikipedia_url: work.wikipedia_url || null,
    twitter_username: work.twitter_username || null,
    twitter_hashtag: work.twitter_hashtag || null,
    mal_anime_id: work.mal_anime_id == null ? null : String(work.mal_anime_id),
    syobocal_tid: work.syobocal_tid == null ? null : String(work.syobocal_tid),
    poster_url: work.images?.recommended_url || null,
    banner_url: work.images?.facebook?.og_image_url || null,
    is_published: Boolean(title),
    source_synced_at: new Date().toISOString()
  };
}

Deno.serve(async (req: Request) => {
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

    const body = await req.json().catch(() => ({}));
    const startPage = Math.max(1, Math.floor(Number(body?.startPage) || 1));
    const maxPages = Math.min(5, Math.max(1, Math.floor(Number(body?.maxPages) || 3)));
    const perPage = 50;
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

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
        const params = new URLSearchParams({ page: String(page), per_page: String(perPage), sort_id: "asc" });
        const response = await fetch("https://api.annict.com/v1/works?" + params.toString(), {
          headers: {
            Authorization: "Bearer " + annictToken,
            Accept: "application/json",
            "User-Agent": "ANIXIA/1.0 (https://the-rascal-of-sakurasou.github.io/anixia/)"
          }
        });
        if (!response.ok) {
          const details = await response.text();
          throw new Error("Annict API returned HTTP " + response.status + ": " + details.slice(0, 300));
        }
        const payload = await response.json();
        const works = Array.isArray(payload.works) ? payload.works : [];
        totalCount = Number.isFinite(payload.total_count) ? payload.total_count : totalCount;
        pagesRequested++;
        recordsSeen += works.length;
        if (works.length) {
          const rows = works.map(mapWork).filter(row => row.title && row.source_id);
          if (rows.length) {
            const saved = await admin.from("anime").upsert(rows, { onConflict: "source,source_id" });
            if (saved.error) throw saved.error;
            upserted += rows.length;
          }
        }
        nextPage = payload.next_page == null ? null : Number(payload.next_page);
        if (nextPage == null || !Number.isFinite(nextPage)) break;
        page = nextPage;
        await new Promise(resolve => setTimeout(resolve, 350));
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
      return json({ status: done ? "completed" : "partial", pagesRequested, recordsSeen, recordsInsertedOrUpdated: upserted, totalCount, nextPage, done });
    } catch (error) {
      await admin.from("catalog_sync_runs").update({
        finished_at: new Date().toISOString(), status: "failed",
        pages_requested: pagesRequested, records_seen: recordsSeen,
        records_inserted_or_updated: upserted, error_message: String(error).slice(0, 1000)
      }).eq("id", runId);
      throw error;
    }
  } catch (error) {
    console.error("ANIXIA catalog sync failed:", error);
    return json({ error: "作品データの同期に失敗しました。管理ログを確認してください。" }, 500);
  }
});
