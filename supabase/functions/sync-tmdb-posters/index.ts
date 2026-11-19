import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-anixia-cron-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const TMDB_API = "https://api.themoviedb.org/3";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";
const TMDB_TERMS = "https://www.themoviedb.org/api-terms-of-use";
const TMDB_NOTICE = "This product uses the TMDB API but is not endorsed or certified by TMDB.";

type AnimeWork = { id: string; title: string; title_ja: string | null; format: string; release_year: number | null; poster_url: string | null };
type TmdbItem = { id: number; title?: string; name?: string; original_title?: string; original_name?: string; poster_path?: string | null; release_date?: string; first_air_date?: string };

async function digestHex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/[\s\p{P}\p{S}]+/gu, "");
}
function itemYear(item: TmdbItem): number | null {
  const match = (item.release_date || item.first_air_date || "").match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}
function exactTitleMatch(work: AnimeWork, item: TmdbItem): boolean {
  const known = [work.title_ja, work.title].filter((v): v is string => !!v?.trim()).map(normalize);
  const candidate = [item.title, item.name, item.original_title, item.original_name].filter((v): v is string => !!v?.trim()).map(normalize);
  return candidate.some((value) => known.includes(value));
}
async function tmdbSearch(token: string, media: "tv" | "movie", query: string): Promise<TmdbItem[]> {
  const params = new URLSearchParams({ query, language: "ja-JP", include_adult: "false" });
  const response = await fetch(TMDB_API + "/search/" + media + "?" + params, {
    headers: { Authorization: "Bearer " + token, accept: "application/json" },
  });
  if (!response.ok) throw new Error("TMDB " + media + " search failed (" + response.status + "): " + (await response.text()).slice(0, 300));
  const payload = await response.json();
  return Array.isArray(payload.results) ? payload.results as TmdbItem[] : [];
}
async function findPoster(token: string, work: AnimeWork): Promise<{ item: TmdbItem; media: "tv" | "movie" } | null> {
  const names = [...new Set([work.title_ja, work.title].filter((v): v is string => !!v?.trim()))];
  const mediaTypes: ("tv" | "movie")[] = work.format === "movie" ? ["movie", "tv"] : ["tv", "movie"];
  for (const name of names) {
    for (const media of mediaTypes) {
      const items = await tmdbSearch(token, media, name);
      const matches = items.filter((item) => {
        if (!item.poster_path || !exactTitleMatch(work, item)) return false;
        const year = itemYear(item);
        if (work.release_year && year && Math.abs(year - work.release_year) > 1) return false;
        if (work.release_year && !year) return false;
        return true;
      });
      if (matches.length === 1) return { item: matches[0], media };
      if (matches.length > 1 && work.release_year) {
        const exactYear = matches.filter((item) => itemYear(item) === work.release_year);
        if (exactYear.length === 1) return { item: exactYear[0], media };
      }
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase function secrets are incomplete." }, 500);
  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const cronToken = req.headers.get("x-anixia-cron-token") || "";
  if (!cronToken) return json({ error: "Unauthorized" }, 401);
  const stored = await db.from("catalog_sync_secrets").select("secret_hash").eq("id", 1).maybeSingle();
  if (stored.error || !stored.data?.secret_hash || !sameToken(await digestHex(cronToken), String(stored.data.secret_hash))) {
    return json({ error: "Unauthorized" }, 401);
  }

  const tmdbToken = Deno.env.get("TMDB_API_READ_ACCESS_TOKEN");
  if (!tmdbToken) return json({
    error: "TMDB_API_READ_ACCESS_TOKEN secret is not configured.",
    setup: "Add the TMDB API Read Access Token in Supabase Edge Function secrets.",
  }, 503);

  let body: { limit?: number; force?: boolean; animeIds?: string[] } = {};
  try { body = await req.json(); } catch { /* empty body is allowed */ }
  const limit = Math.min(50, Math.max(1, Number(body.limit) || 20));
  let query = db.from("anime").select("id,title,title_ja,format,release_year,poster_url")
    .eq("is_published", true).order("release_year", { ascending: false, nullsFirst: false }).limit(limit);
  if (Array.isArray(body.animeIds) && body.animeIds.length) query = query.in("id", body.animeIds.slice(0, 50));
  else if (!body.force) query = query.is("poster_url", null);
  const { data: works, error: readError } = await query;
  if (readError) return json({ error: readError.message }, 500);

  const runInsert = await db.from("catalog_sync_runs").insert({
    source: "tmdb-posters", started_at: new Date().toISOString(), status: "running",
    pages_requested: 0, records_seen: 0, records_inserted_or_updated: 0,
  }).select("id").maybeSingle();
  if (runInsert.error) return json({ error: "Could not create sync log: " + runInsert.error.message }, 500);

  const result = { scanned: 0, updated: 0, unmatched: [] as string[], errors: [] as string[] };
  for (const work of (works || []) as AnimeWork[]) {
    result.scanned++;
    try {
      const found = await findPoster(tmdbToken, work);
      if (!found) {
        result.unmatched.push(work.title_ja || work.title);
        await db.from("anime").update({ poster_attempted_at: new Date().toISOString() }).eq("id", work.id);
        continue;
      }
      const posterUrl = TMDB_IMAGE + found.item.poster_path;
      const sourceUrl = "https://www.themoviedb.org/" + found.media + "/" + found.item.id;
      const { data: updated, error: updateError } = await db.from("anime").update({
        poster_url: posterUrl, poster_source: "tmdb", poster_source_id: String(found.item.id),
        poster_attribution: TMDB_NOTICE, poster_source_url: sourceUrl,
        poster_license: "TMDB API attribution required; image rights remain with their respective copyright holders.",
        poster_license_url: TMDB_TERMS, poster_synced_at: new Date().toISOString(),
        poster_attempted_at: new Date().toISOString(),
      }).eq("id", work.id).select("id").maybeSingle();
      if (updateError) throw updateError;
      if (!updated?.id || updated.id !== work.id) throw new Error("DB update returned no matching anime row.");
      result.updated++;
    } catch (error) {
      result.errors.push((work.title_ja || work.title) + ": " + (error instanceof Error ? error.message : String(error)));
    }
  }
  await db.from("catalog_sync_runs").update({
    finished_at: new Date().toISOString(),
    status: result.errors.length ? (result.updated ? "partial" : "error") : "success",
    pages_requested: 0, records_seen: result.scanned, records_inserted_or_updated: result.updated,
    error_message: result.errors.length ? result.errors.slice(0, 10).join(" | ") : null,
  }).eq("id", runInsert.data?.id);
  return json({
    ...result,
    message: "Exact-title and release-year matches only. TMDB artwork is not asserted to be official studio artwork.",
  });
});