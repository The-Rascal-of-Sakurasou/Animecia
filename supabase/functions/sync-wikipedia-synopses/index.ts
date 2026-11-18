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
class RetryableApiError extends Error {
  retryAfter: string | null;
  constructor(message: string, retryAfter: string | null = null) {
    super(message);
    this.retryAfter = retryAfter;
  }
}
const userAgent = "ANIXIA/1.0 (https://the-rascal-of-sakurasou.github.io/anixia/; Japanese anime catalog)";

async function fetchSynopsis(title: string) {
  const bareUrl = "https://ja.wikipedia.org/w/rest.php/v1/page/" + encodeURIComponent(title) + "/bare";
  const bareResponse = await fetch(bareUrl, { headers: { "User-Agent": userAgent, "Accept": "application/json" } });
  if (bareResponse.status === 404) return null;
  if (bareResponse.status === 429) throw new RetryableApiError("Wikipedia REST API rate limited", bareResponse.headers.get("Retry-After"));
  if (!bareResponse.ok) throw new Error("Wikipedia REST API error: " + bareResponse.status);
  const bare = await bareResponse.json();
  const licenseUrl = String(bare?.license?.url || "").replace(/^http:/i, "https:");
  const licenseTitle = String(bare?.license?.title || "");
  if (!/creativecommons\.org\/licenses\/by-sa\/(?:3\.0|4\.0)\/?$/i.test(licenseUrl.replace(/^\/\//, "https://"))) return null;
  const revisionId = Number(bare?.latest?.id || 0);
  const pageTitle = String(bare?.title || "");
  if (!revisionId || !pageTitle || norm(pageTitle) !== norm(title)) return null;

  const params = new URLSearchParams({
    action: "query", format: "json", formatversion: "2",
    prop: "extracts|info|pageprops", revids: String(revisionId),
    exintro: "1", explaintext: "1", inprop: "url"
  });
  const apiResponse = await fetch("https://ja.wikipedia.org/w/api.php?" + params, {
    headers: { "User-Agent": userAgent, "Accept": "application/json" }
  });
  if (apiResponse.status === 429) throw new RetryableApiError("Wikipedia Action API rate limited", apiResponse.headers.get("Retry-After"));
  if (!apiResponse.ok) throw new Error("Wikipedia Action API error: " + apiResponse.status);
  const payload = await apiResponse.json();
  const page = Array.isArray(payload?.query?.pages) ? payload.query.pages[0] : null;
  if (!page || page.missing || page.pageprops?.disambiguation || norm(page.title) !== norm(title)) return null;
  const extract = String(page.extract || "").replace(/\r/g, "").trim();
  if (extract.length < 100 || extract.length > 2400) return null;
  if (/曖昧さ回避|この記事は.*曖昧さ回避/.test(extract.slice(0, 240))) return null;
  const canonicalUrl = String(page.fullurl || ("https://ja.wikipedia.org/wiki/" + encodeURIComponent(page.title.replace(/ /g, "_"))));
  const revisionUrl = "https://ja.wikipedia.org/w/index.php?title=" + encodeURIComponent(page.title) + "&oldid=" + revisionId;
  return {
    title: page.title,
    extract,
    sourceUrl: canonicalUrl,
    revisionId,
    revisionUrl,
    license: licenseTitle || "CC BY-SA",
    licenseUrl: licenseUrl.startsWith("//") ? "https:" + licenseUrl : licenseUrl,
    attribution: "Wikipedia contributors"
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const cronToken = req.headers.get("x-anixia-cron-token") || "";
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Supabase function secrets are incomplete." }, 500);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let authorized = false;
  if (cronToken) {
    const stored = await db.from("catalog_sync_secrets").select("secret_hash").eq("id", 1).maybeSingle();
    if (stored.error) return json({ error: "同期トークンを検証できません。"}, 500);
    authorized = Boolean(stored.data?.secret_hash) && sameToken(await digestHex(cronToken), String(stored.data.secret_hash));
  }
  if (!authorized) {
    if (!token) return json({ error: "管理者ログインまたは有効な同期トークンが必要です。"}, 401);
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "認証を確認できませんでした。"}, 401);
    const { data: isAdmin, error: adminError } = await userClient.rpc("is_anixia_admin");
    if (adminError || isAdmin !== true) return json({ error: "管理者権限が必要です。"}, 403);
  }

  const sourceCheck = await db.from("catalog_sources").select("rights_review_status,is_enabled").eq("code", "japanese_wikipedia").single();
  if (sourceCheck.error) return json({ error: "Wikipediaの利用承認状態を確認できません。"}, 500);
  if (!sourceCheck.data?.is_enabled || sourceCheck.data.rights_review_status !== "approved") {
    return json({ error: "Wikipediaの利用承認が有効ではないため、同期を停止しました。"}, 423);
  }

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 20);
  const requestedIds = Array.isArray(body.animeIds)
    ? [...new Set(body.animeIds.map((v: unknown) => String(v || "")).filter((v: string) => /^[0-9a-f-]{36}$/i.test(v)))].slice(0, 20)
    : [];
  const retryBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  let workQuery = db.from("anime")
    .select("id,title,title_ja,title_kana,synopsis,synopsis_attempted_at")
    .eq("is_published", true)
    .is("synopsis", null)
    .or("synopsis_attempted_at.is.null,synopsis_attempted_at.lt." + retryBefore)
    .order("synopsis_attempted_at", { ascending: true, nullsFirst: true })
    .order("release_year", { ascending: false, nullsFirst: false });
  if (requestedIds.length) workQuery = workQuery.in("id", requestedIds);
  const { data: works, error: listError } = await workQuery.limit(limit);
  if (listError) return json({ error: listError.message }, 500);

  const { data: run, error: runError } = await db.from("catalog_sync_runs").insert({
    source: "japanese-wikipedia-synopsis",
    status: "running",
    pages_requested: limit,
    records_seen: 0,
    records_inserted_or_updated: 0
  }).select("id").single();
  if (runError) return json({ error: runError.message }, 500);

  const result = { scanned: 0, updated: 0, unmatched: [] as string[], errors: [] as string[], retryAfter: null as string | null };
  for (const work of works || []) {
    const label = work.title_ja || work.title || work.id;
    result.scanned++;
    try {
      const candidates = [...new Set([work.title_ja, work.title, work.title_kana].filter((v: unknown) => String(v || "").trim().length >= 2))];
      let article: any = null;
      for (const candidate of candidates) {
        article = await fetchSynopsis(String(candidate));
        if (article) break;
      }
      if (!article) {
        const mark = await db.from("anime").update({ synopsis_attempted_at: new Date().toISOString() })
          .eq("id", work.id).is("synopsis", null);
        if (mark.error) throw mark.error;
        result.unmatched.push(label);
        continue;
      }
      const { error } = await db.from("anime").update({
        synopsis: article.extract,
        synopsis_source: "japanese_wikipedia",
        synopsis_source_title: article.title,
        synopsis_source_url: article.sourceUrl,
        synopsis_source_revision_id: article.revisionId,
        synopsis_source_revision_url: article.revisionUrl,
        synopsis_license: article.license,
        synopsis_license_url: article.licenseUrl,
        synopsis_attribution: article.attribution,
        synopsis_synced_at: new Date().toISOString(),
        synopsis_attempted_at: new Date().toISOString()
      }).eq("id", work.id).is("synopsis", null);
      if (error) throw error;
      result.updated++;
    } catch (error) {
      if (error instanceof RetryableApiError) {
        result.retryAfter = error.retryAfter;
        result.errors.push(label + ": " + error.message);
        break;
      }
      result.errors.push(label + ": " + String(error).slice(0, 180));
    }
  }
  const status = result.errors.length && result.updated === 0 ? "failed" : "succeeded";
  const runUpdate = await db.from("catalog_sync_runs").update({
    status,
    finished_at: new Date().toISOString(),
    records_seen: result.scanned,
    records_inserted_or_updated: result.updated,
    error_message: result.errors.length ? result.errors.join(" | ").slice(0, 2000) : null
  }).eq("id", run.id);
  if (runUpdate.error) result.errors.push("実行ログの保存に失敗: " + runUpdate.error.message);

  return json({
    ...result,
    message: "CC BY-SA 4.0をAPIで確認でき、作品名が完全一致したWikipedia記事の冒頭だけを取得しました。出典・改訂版・ライセンス情報を作品データに保存しています。"
  }, result.retryAfter ? 429 : 200);
});
