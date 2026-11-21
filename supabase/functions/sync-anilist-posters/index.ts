import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-anixia-cron-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const API = "https://graphql.anilist.co";
const QUERY = `query ($search: String!) {
  Page(perPage: 10) {
    media(search: $search, type: ANIME, isAdult: false) {
      id
      title { native romaji english }
      synonyms
      coverImage { large extraLarge }
      format
      seasonYear
      startDate { year }
      siteUrl
    }
  }
}`;

type Work = {
  id: string; title: string; title_ja: string | null; title_kana: string | null;
  release_year: number | null; format: string; poster_url: string | null;
  poster_attempted_at: string | null;
};
type Media = {
  id: number;
  title?: { native?: string | null; romaji?: string | null; english?: string | null };
  synonyms?: string[];
  coverImage?: { large?: string | null; extraLarge?: string | null };
  format?: string | null;
  seasonYear?: number | null;
  startDate?: { year?: number | null };
  siteUrl?: string;
};
const norm = (value: unknown) => String(value ?? "").normalize("NFKC")
  .toLocaleLowerCase("ja-JP").replace(/[\s\p{P}\p{S}]+/gu, "");
const yearOf = (m: Media) => Number(m.seasonYear || m.startDate?.year || 0) || null;
const formatMatches = (format: string, mediaFormat: string) => {
  const f = String(format || "").toLowerCase();
  const m = String(mediaFormat || "").toUpperCase();
  if (f === "movie") return m === "MOVIE";
  if (f === "tv") return ["TV", "TV_SHORT"].includes(m);
  if (f === "ova") return m === "OVA";
  if (f === "ona" || f === "web") return m === "ONA";
  if (f === "special") return m === "SPECIAL";
  return true;
};
async function searchAniList(search: string): Promise<Media[]> {
  const response = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { search } }),
  });
  if (response.status === 429) throw new Error("AniList rate limit (429)");
  if (!response.ok) throw new Error("AniList API error (" + response.status + ")");
  const payload = await response.json();
  if (Array.isArray(payload?.errors) && payload.errors.length) {
    throw new Error("AniList GraphQL error: " + String(payload.errors[0]?.message || "unknown").slice(0, 160));
  }
  return Array.isArray(payload?.data?.Page?.media) ? payload.data.Page.media as Media[] : [];
}
async function findPoster(work: Work): Promise<Media | null> {
  const searches = [...new Set([work.title_ja, work.title, work.title_kana]
    .filter((v): v is string => !!v?.trim()))].slice(0, 2);
  const found = new Map<number, Media>();
  for (const term of searches) {
    for (const item of await searchAniList(term)) found.set(item.id, item);
    const exact = [...found.values()].filter(item => {
      const names = [item.title?.native, item.title?.romaji, item.title?.english, ...(item.synonyms || [])]
        .map(norm).filter(Boolean);
      if (!names.includes(norm(term))) return false;
      const year = yearOf(item);
      if (work.release_year && year && Math.abs(year - work.release_year) > 1) return false;
      if (work.release_year && !year) return false;
      return true;
    });
    if (exact.length) break;
  }
  const candidates = [...found.values()].filter(item => {
    const image = item.coverImage?.extraLarge || item.coverImage?.large;
    if (!image || !/^https:\/\/s[0-9]+\.anilist\.co\//i.test(image)) return false;
    const names = [item.title?.native, item.title?.romaji, item.title?.english, ...(item.synonyms || [])]
      .map(norm).filter(Boolean);
    const targets = [work.title_ja, work.title, work.title_kana].map(norm).filter(Boolean);
    if (!targets.some(target => names.includes(target))) return false;
    const year = yearOf(item);
    if (work.release_year && year && Math.abs(year - work.release_year) > 1) return false;
    if (work.release_year && !year) return false;
    return true;
  });
  if (!candidates.length) return null;
  const scored = candidates.map(item => {
    const names = [item.title?.native, item.title?.romaji, item.title?.english, ...(item.synonyms || [])]
      .map(norm).filter(Boolean);
    const targets = [work.title_ja, work.title, work.title_kana].map(norm).filter(Boolean);
    const year = yearOf(item);
    return { item, score: 100 + (work.release_year && year === work.release_year ? 20 : 0)
      + (formatMatches(work.format, item.format || "") ? 10 : 0)
      + (targets.includes(names[0]) ? 2 : 0) };
  }).sort((a, b) => b.score - a.score);
  if (scored.length > 1 && scored[0].score === scored[1].score) return null;
  return scored[0].item;
}
async function digestHex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, "0")).join("");
}
function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Supabase function secrets are incomplete." }, 500);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const cronToken = req.headers.get("x-anixia-cron-token") || "";
  let authorized = false;
  if (cronToken) {
    const stored = await db.from("catalog_sync_secrets").select("secret_hash").eq("id", 1).maybeSingle();
    if (stored.error) return json({ error: "Sync token validation failed." }, 500);
    authorized = Boolean(stored.data?.secret_hash) &&
      sameToken(await digestHex(cronToken), String(stored.data.secret_hash));
  }
  if (!authorized) {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\\s+/i, "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!token || !anonKey) return json({ error: "Administrator login is required." }, 401);
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Could not verify administrator session." }, 401);
    const { data: isAdmin, error: adminError } = await userClient.rpc("is_anixia_admin");
    if (adminError || isAdmin !== true) return json({ error: "Administrator permission is required." }, 403);
  }
  const approval = await db.from("catalog_sources").select("rights_review_status,is_enabled")
    .eq("code", "anilist").single();
  if (approval.error) return json({ error: "AniList source approval could not be checked." }, 500);
  if (!approval.data.is_enabled || approval.data.rights_review_status !== "approved") {
    return json({ error: "AniList source is not approved for synchronization." }, 423);
  }
  let body: { limit?: number; force?: boolean; animeIds?: string[] } = {};
  try { body = await req.json(); } catch { /* empty body is allowed */ }
  const limit = Math.min(20, Math.max(1, Number(body.limit) || 12));
  const force = body.force === true;
  const requestedIds = Array.isArray(body.animeIds)
    ? [...new Set(body.animeIds.map(String).filter(v => /^[0-9a-f-]{36}$/i.test(v)))].slice(0, 30) : [];
  const buildQuery = () => {
    let q = db.from("anime")
      .select("id,title,title_ja,title_kana,release_year,format,poster_url,poster_attempted_at")
      .is("poster_url", null)
      .order("release_year", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true });
    if (!force) q = q.is("poster_attempted_at", null);
    return q.limit(limit);
  };
  const { data: works, error: listError } = await buildQuery();
  if (listError) return json({ error: listError.message }, 500);
  const result = { scanned: (works || []).length, updated: 0, skipped: 0,
    unmatched: [] as string[], errors: [] as string[] };
  for (const work of (works || []) as Work[]) {
    if (work.poster_url || (!force && work.poster_attempted_at)) { result.skipped++; continue; }
    try {
      const media = await findPoster(work);
      const attemptedAt = new Date().toISOString();
      if (!media) {
        result.unmatched.push(work.title_ja || work.title);
        await db.from("anime").update({ poster_attempted_at: attemptedAt }).eq("id", work.id);
        continue;
      }
      const posterUrl = media.coverImage?.extraLarge || media.coverImage?.large;
      const sourceUrl = media.siteUrl || "https://anilist.co/anime/" + media.id;
      const { data: updated, error } = await db.from("anime").update({
        poster_url: posterUrl,
        poster_source: "anilist",
        poster_source_id: String(media.id),
        poster_attribution: "AniList",
        poster_source_url: sourceUrl,
        poster_license: "ANIXIA向け利用許可取得済み（運営者申告）。画像の原著作権は各権利者に帰属。",
        poster_license_url: null,
        poster_synced_at: attemptedAt,
        poster_attempted_at: attemptedAt,
      }).eq("id", work.id).select("id").maybeSingle();
      if (error) throw error;
      if (!updated?.id || updated.id !== work.id) throw new Error("DB update returned no matching anime row.");
      result.updated++;
    } catch (error) {
      const attemptedAt = new Date().toISOString();
      await db.from("anime").update({ poster_attempted_at: attemptedAt }).eq("id", work.id);
      result.errors.push((work.title_ja || work.title) + ": " +
        (error instanceof Error ? error.message : String(error)).slice(0, 180));
    }
  }
  return json({ ...result, completed: (works || []).length < limit,
    message: "Only exact title matches with a compatible release year are imported; ambiguous matches are skipped." });
});