import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-anixia-cron-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const norm = (value: unknown) => String(value ?? "").normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/[\s\p{P}\p{S}]/gu, "");
const cleanHtml = (value: unknown) => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().slice(0, 500);

function licenseInfo(meta: Record<string, any>) {
  const short = cleanHtml(meta?.LicenseShortName?.value);
  const url = cleanHtml(meta?.LicenseUrl?.value);
  const artist = cleanHtml(meta?.Artist?.value);
  const credit = cleanHtml(meta?.Credit?.value);
  const s = short.toLowerCase();
  const u = url.toLowerCase();
  const allowed =
    /^(cc0|public domain|pd|cc by(?:-sa)?(?:\s|$))/i.test(short) ||
    u.includes("creativecommons.org/publicdomain/zero") ||
    /creativecommons\.org\/licenses\/by(?:-sa)?\//.test(u) ||
    /publicdomain\/mark/.test(u);
  if (!allowed || /non.?commercial|\bnd\b|fair use|all rights reserved/i.test(short + " " + url)) return null;
  if (!short || (!artist && !credit && !/^cc0|^public domain|^pd/i.test(short))) return null;
  return { short, url, artist, credit, attribution: [artist || credit, short, url].filter(Boolean).join(" · ") };
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

async function searchImage(work: any) {
  const candidates = [...new Set([work.title_ja, work.title, work.title_kana].filter((v: unknown) => String(v || "").trim().length >= 3))].slice(0, 3);
  for (const query of candidates) {
    const params = new URLSearchParams({
      action: "query", format: "json", formatversion: "2",
      generator: "search", gsrsearch: query, gsrnamespace: "6", gsrlimit: "10",
      prop: "imageinfo", iiprop: "url|size|extmetadata", iiurlwidth: "600",
      origin: "*"
    });
    const response = await fetch("https://commons.wikimedia.org/w/api.php?" + params, {
      headers: { "User-Agent": "ANIXIA/1.0 (https://the-rascal-of-sakurasou.github.io/anixia/; public anime database)" }
    });
    if (!response.ok) throw new Error("Wikimedia Commons API error: " + response.status);
    const payload = await response.json();
    const pages = Array.isArray(payload?.query?.pages) ? payload.query.pages : [];
    const target = norm(query);
    const ranked = pages.map((page: any) => {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl || !info?.descriptionurl || !String(info.thumburl).startsWith("https://upload.wikimedia.org/")) return null;
      const rawFileName = String(page.title || "").replace(/^File:/i, "").replace(/\.[a-z0-9]{2,5}$/i, "");
      const fileName = norm(rawFileName);
      const description = norm(cleanHtml(info.extmetadata?.ImageDescription?.value));
      const posterContext = /poster|key[ -]?visual|cover|dvd|blu[ -]?ray|promotional|artwork|ポスター|キービジュアル|表紙/i.test(rawFileName + " " + cleanHtml(info.extmetadata?.ImageDescription?.value));
      if (!posterContext) return null;
      const exact = fileName === target || description === target;
      const contains = fileName.includes(target) || description.includes(target);
      const width = Number(info.width || 0), height = Number(info.height || 0);
      if (width < 200 || height < 280 || width / height < 0.38 || width / height > 0.9) return null;
      const license = licenseInfo(info.extmetadata || {});
      if (!license) return null;
      const yearMatch = work.release_year && String(page.title).includes(String(work.release_year));
      // Commons search already ranks title-related results. Permit a unique,
      // portrait poster result even when the filename uses a romanized title.
      return { page, info, license, score: (exact ? 100 : contains ? 90 : 60) + (yearMatch ? 10 : 0) };
    }).filter(Boolean).sort((a: any, b: any) => b.score - a.score);
    if (ranked.length && (!ranked[1] || ranked[0].score > ranked[1].score)) {
      const best = ranked[0];
      return {
        url: best.info.thumburl,
        id: best.page.title,
        page: best.info.descriptionurl,
        attribution: best.license.attribution,
        license: best.license.short
      };
    }
  }

  // Wikidata P18 fallback: use only Commons-hosted files with an accepted
  // open licence and portrait dimensions. P18 directly associates the file
  // with the anime entity, avoiding title/romanization search ambiguity.
  const qid = String(work.source_id || "");
  if (/^Q[1-9]\\d*$/.test(qid)) {
    const entityParams = new URLSearchParams({
      action: "wbgetentities", ids: qid, props: "claims", format: "json", origin: "*"
    });
    const entityResponse = await fetch("https://www.wikidata.org/w/api.php?" + entityParams, {
      headers: { "User-Agent": "ANIXIA/1.0 (https://the-rascal-of-sakurasou.github.io/anixia/; poster metadata sync)" }
    });
    if (entityResponse.ok) {
      const entityPayload = await entityResponse.json();
      const fileName = entityPayload?.entities?.[qid]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (typeof fileName === "string" && fileName.trim()) {
        const imageParams = new URLSearchParams({
          action: "query", format: "json", formatversion: "2",
          titles: "File:" + fileName, prop: "imageinfo",
          iiprop: "url|size|extmetadata", iiurlwidth: "600", origin: "*"
        });
        const imageResponse = await fetch("https://commons.wikimedia.org/w/api.php?" + imageParams, {
          headers: { "User-Agent": "ANIXIA/1.0 (https://the-rascal-of-sakurasou.github.io/anixia/; public anime database)" }
        });
        if (imageResponse.ok) {
          const imagePayload = await imageResponse.json();
          const page = (imagePayload?.query?.pages || [])[0];
          const info = page?.imageinfo?.[0];
          const width = Number(info?.width || 0), height = Number(info?.height || 0);
          const license = licenseInfo(info?.extmetadata || {});
          if (info?.thumburl && info?.descriptionurl &&
              String(info.thumburl).startsWith("https://upload.wikimedia.org/") &&
              width >= 200 && height >= 280 && width / height >= 0.38 &&
              width / height <= 0.9 && license) {
            return {
              url: info.thumburl, id: page.title, page: info.descriptionurl,
              attribution: license.attribution, license: license.short
            };
          }
        }
      }
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\\s+/i, "");
  const cronToken = req.headers.get("x-anixia-cron-token") || "";
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Supabase function secrets are incomplete." }, 500);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let authorized = false;
  if (cronToken) {
    const stored = await db.from("catalog_sync_secrets").select("secret_hash").eq("id", 1).maybeSingle();
    if (stored.error) return json({ error: "同期トークンを検証できません。" }, 500);
    authorized = Boolean(stored.data?.secret_hash) && sameToken(await digestHex(cronToken), String(stored.data.secret_hash));
  }
  if (!authorized) {
    if (!token) return json({ error: "管理者ログインまたは有効な同期トークンが必要です。" }, 401);
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "認証を確認できませんでした。" }, 401);
    const { data: isAdmin, error: adminError } = await userClient.rpc("is_anixia_admin");
    if (adminError || isAdmin !== true) return json({ error: "管理者権限が必要です。" }, 403);
  }

  const sourceCheck = await db.from("catalog_sources")
    .select("rights_review_status,is_enabled")
    .eq("code", "wikimedia_commons")
    .single();
  if (sourceCheck.error) return json({ error: "Wikimedia Commonsの利用承認状態を確認できません。" }, 500);
  if (!sourceCheck.data?.is_enabled || sourceCheck.data.rights_review_status !== "approved") {
    return json({ error: "Wikimedia Commonsの利用承認が有効ではないため、同期を停止しました。" }, 423);
  }

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 30);
  const force = body.force === true;
  const requestedIds = Array.isArray(body.animeIds)
    ? [...new Set(body.animeIds.map((v: unknown) => String(v || "")).filter((v: string) => /^[0-9a-f-]{36}$/i.test(v)))].slice(0, 30)
    : [];
  let offset = 0;
  if (!requestedIds.length && !force) {
    const state = await db.from("catalog_sync_state").select("next_offset").eq("source", "commons-posters").maybeSingle();
    if (state.error) return json({ error: state.error.message }, 500);
    offset = Math.max(0, Number(state.data?.next_offset) || 0);
  }
  const buildQuery = (startAt: number) => {
    let query = db.from("anime").select("id,title,title_ja,title_kana,release_year,poster_url,source_id")
      .eq("is_published", true).order("release_year", { ascending: false, nullsFirst: false });
    if (requestedIds.length) query = query.in("id", requestedIds);
    if (!force) query = query.is("poster_url", null);
    return query.range(startAt, startAt + limit - 1);
  };
  let { data: works, error: listError } = await buildQuery(offset);
  if (listError) return json({ error: listError.message }, 500);
  if (!requestedIds.length && !force && (!works || works.length === 0) && offset > 0) {
    offset = 0;
    const reset = await db.from("catalog_sync_state").upsert({
      source: "commons-posters", next_offset: 0, updated_at: new Date().toISOString()
    }, { onConflict: "source" });
    if (reset.error) return json({ error: reset.error.message }, 500);
    const firstPage = await buildQuery(0);
    works = firstPage.data;
    listError = firstPage.error;
    if (listError) return json({ error: listError.message }, 500);
  }

  const results = { scanned: (works || []).length, updated: 0, unmatched: [] as string[], errors: [] as string[] };
  for (const work of works || []) {
    try {
      const image = await searchImage(work);
      if (!image) { results.unmatched.push(work.title_ja || work.title || work.id); continue; }
      const { error } = await db.from("anime").update({
        poster_url: image.url,
        poster_source: "wikimedia_commons",
        poster_source_id: image.id,
        poster_attribution: image.attribution,
        poster_source_url: image.page,
        poster_synced_at: new Date().toISOString()
      }).eq("id", work.id);
      if (error) throw error;
      results.updated++;
    } catch (error) {
      results.errors.push((work.title_ja || work.title || work.id) + ": " + String(error).slice(0, 160));
    }
  }
  if (!requestedIds.length && !force) {
    const nextOffset = (works || []).length < limit ? 0 : offset + limit;
    const stateUpdate = await db.from("catalog_sync_state").upsert({
      source: "commons-posters", next_offset: nextOffset,
      last_success_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }, { onConflict: "source" });
    if (stateUpdate.error) results.errors.push("同期位置の保存に失敗: " + stateUpdate.error.message);
  }
  return json({
    ...results,
    nextOffset: (!requestedIds.length && !force) ? ((works || []).length < limit ? 0 : offset + limit) : null,
    message: "ライセンス条件を確認できたWikimedia Commons画像だけを登録しました。"
  });
});