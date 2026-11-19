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
  const rawUrl = cleanHtml(meta?.LicenseUrl?.value);
  const url = rawUrl.startsWith("//") ? "https:" + rawUrl : rawUrl.startsWith("http://creativecommons.org/") ? rawUrl.replace(/^http:/i, "https:") : rawUrl;
  const artist = cleanHtml(meta?.Artist?.value || meta?.Author?.value);
  const credit = cleanHtml(meta?.Credit?.value || meta?.Attribution?.value);
  const normalized = short.toLowerCase();
  const licenseUrl = url.toLowerCase();
  const copyrighted = cleanHtml(meta?.Copyrighted?.value).toLowerCase();
  const cc0 = /^(?:cc0(?:\s|$)|cc zero)$/i.test(short) && /creativecommons\.org\/publicdomain\/zero\//.test(licenseUrl);
  const publicDomain = /^(public domain|pd|public domain mark)$/i.test(short) &&
    (/creativecommons\.org\/publicdomain\/mark\//.test(licenseUrl) || (!licenseUrl && copyrighted === "false"));
  const ccBy = /^cc by(?:\s|$)/i.test(short) && /creativecommons\.org\/licenses\/by\/\d+(?:\.\d+)?\//.test(licenseUrl);
  const ccBySa = /^cc by-sa(?:\s|$)/i.test(short) && /creativecommons\.org\/licenses\/by-sa\/\d+(?:\.\d+)?\//.test(licenseUrl);
  const allowed = cc0 || publicDomain || ccBy || ccBySa;
  const effectiveLicenseUrl = url || (publicDomain && copyrighted === "false"
    ? "https://commons.wikimedia.org/wiki/Commons:Licensing" : "");
  if (!allowed || (!/^https:\/\/creativecommons\.org\//i.test(url) && !effectiveLicenseUrl)) return null;
  if (/non.?commercial|by-nc|\bnd\b|by-nd|fair.?use|all.?rights.?reserved/i.test(normalized + " " + licenseUrl)) return null;
  const attribution = artist || credit;
  // CC BY / CC BY-SA require a real creator or credit line; never invent one.
  if ((ccBy || ccBySa) && !attribution) return null;
  return {
    short,
    url: effectiveLicenseUrl,
    artist,
    credit,
    attribution: attribution || "Public domain / CC0"
  };
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
  console.log("poster-debug:start", JSON.stringify({id:work.id,qid:work.source_id,title:work.title_ja}));
  // Prefer Wikidata P18: the image is directly linked to this exact anime item,
  // so matching does not depend on Japanese/English filename spelling.
  const qid = String(work.source_id || "");
  const extraTitles: string[] = [];
  if (/^Q[1-9][0-9]*$/.test(qid)) {
    try {
      const entityParams = new URLSearchParams({
        action: "wbgetentities", ids: qid, props: "claims|labels|aliases", languages: "en|ja", format: "json", origin: "*"
      });
      const entityResponse = await fetch("https://www.wikidata.org/w/api.php?" + entityParams, {
        headers: { "User-Agent": "ANIXIA/1.0 (https://the-rascal-of-sakurasou.github.io/anixia/; anime image metadata)" }
      });
      if (entityResponse.ok) {
        const entityPayload = await entityResponse.json();
        const entity = entityPayload?.entities?.[qid];
        const enLabel = entity?.labels?.en?.value;
        if (enLabel) extraTitles.push(enLabel);
        for (const alias of (entity?.aliases?.en || []).slice(0, 8)) if (alias?.value) extraTitles.push(alias.value);
        const fileName = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        console.log("poster-debug:wikidata", JSON.stringify({qid,p18:fileName,claims:Object.keys(entityPayload?.entities?.[qid]?.claims||{})}));
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
            const logoFile = /logo|ロゴ/i.test(fileName);
            const validShape = logoFile
              ? width >= 200 && height >= 80 && width / height >= 0.5 && width / height <= 6
              : width >= 200 && height >= 280 && width / height >= 0.38 && width / height <= 0.9;
            if (info?.thumburl && info?.descriptionurl && String(info?.mime || "").startsWith("image/") &&
                String(info.thumburl).startsWith("https://upload.wikimedia.org/") &&
                validShape && license) {
              return {
                url: info.thumburl,
                id: page.title,
                page: info.descriptionurl,
                attribution: license.attribution,
                license: license.short,
                licenseUrl: license.url
              };
            }
          }
        }

        // Follow the Wikidata media-franchise link for a logo image (P154)
        // and Commons category (P373), while preferring exact item metadata.
        const franchiseId = entityPayload?.entities?.[qid]?.claims?.P8345?.[0]?.mainsnak?.datavalue?.value?.id;
        console.log("poster-debug:franchise",JSON.stringify({qid,franchiseId}));
        let franchiseClaims: any = null;
        if (franchiseId) {
          const franchiseParams = new URLSearchParams({
            action: "wbgetentities", ids: franchiseId, props: "claims", format: "json", origin: "*"
          });
          const franchiseResponse = await fetch("https://www.wikidata.org/w/api.php?" + franchiseParams, {
            headers: { "User-Agent": "ANIXIA/1.0 (https://the-rascal-of-sakurasou.github.io/anixia/; anime image metadata)" }
          });
          if (franchiseResponse.ok) {
            const franchisePayload = await franchiseResponse.json();
            franchiseClaims = franchisePayload?.entities?.[franchiseId]?.claims || null;
          }
        }
        const logoFileName =
          entityPayload?.entities?.[qid]?.claims?.P154?.[0]?.mainsnak?.datavalue?.value ||
          franchiseClaims?.P154?.[0]?.mainsnak?.datavalue?.value;
        console.log("poster-debug:logo",JSON.stringify({qid,logoFileName}));
        if (typeof logoFileName === "string" && logoFileName.trim()) {
          const logoParams = new URLSearchParams({
            action: "query", format: "json", formatversion: "2",
            titles: "File:" + logoFileName, prop: "imageinfo",
            iiprop: "url|size|extmetadata", iiurlwidth: "600", origin: "*"
          });
          const logoResponse = await fetch("https://commons.wikimedia.org/w/api.php?" + logoParams, {
            headers: { "User-Agent": "ANIXIA/1.0 (https://the-rascal-of-sakurasou.github.io/anixia/; public anime database)" }
          });
          if (logoResponse.ok) {
            const logoPayload = await logoResponse.json();
            const logoPage = (logoPayload?.query?.pages || [])[0];
            const logoInfo = logoPage?.imageinfo?.[0];
            const width = Number(logoInfo?.width || 0), height = Number(logoInfo?.height || 0);
            const license = licenseInfo(logoInfo?.extmetadata || {});
            if (logoInfo?.thumburl && logoInfo?.descriptionurl && String(logoInfo?.mime || "").startsWith("image/") &&
                String(logoInfo.thumburl).startsWith("https://upload.wikimedia.org/") &&
                width >= 200 && height >= 80 && width / height >= 0.5 &&
                width / height <= 6 && license) {
              return {
                url: logoInfo.thumburl,
                id: logoPage.title,
                page: logoInfo.descriptionurl,
                attribution: license.attribution,
                license: license.short,
                licenseUrl: license.url
              };
            }
          }
        }
        const commonsCategory =
          entityPayload?.entities?.[qid]?.claims?.P373?.[0]?.mainsnak?.datavalue?.value ||
          franchiseClaims?.P373?.[0]?.mainsnak?.datavalue?.value;
        console.log("poster-debug:category",JSON.stringify({qid,commonsCategory}));
        if (typeof commonsCategory === "string" && commonsCategory.trim()) {
          const categoryParams = new URLSearchParams({
            action: "query", format: "json", formatversion: "2",
            generator: "categorymembers", gcmtitle: "Category:" + commonsCategory,
            gcmnamespace: "6", gcmlimit: "50", prop: "imageinfo",
            iiprop: "url|size|extmetadata", iiurlwidth: "600", origin: "*"
          });
          const categoryResponse = await fetch("https://commons.wikimedia.org/w/api.php?" + categoryParams, {
            headers: { "User-Agent": "ANIXIA/1.0 (https://the-rascal-of-sakurasou.github.io/anixia/; public anime database)" }
          });
          if (categoryResponse.ok) {
            const categoryPayload = await categoryResponse.json();
            const categoryPages = Array.isArray(categoryPayload?.query?.pages) ? categoryPayload.query.pages : [];
            const categoryMatches = categoryPages.map((page: any) => {
              const info = page.imageinfo?.[0];
              if (!info?.thumburl || !info?.descriptionurl || !String(info?.mime || "").startsWith("image/") || !String(info.thumburl).startsWith("https://upload.wikimedia.org/")) return null;
              const fileName = String(page.title || "").replace(/^File:/i, "");
              const logoFile = /logo|ロゴ/i.test(fileName);
              const posterFile = /poster|key[ -]?visual|cover|ポスター|キービジュアル|表紙/i.test(fileName);
              if (!logoFile && !posterFile) return null;
              const width = Number(info.width || 0), height = Number(info.height || 0);
              const validShape = logoFile
                ? width >= 200 && height >= 80 && width / height >= 0.5 && width / height <= 6
                : width >= 200 && height >= 280 && width / height >= 0.38 && width / height <= 0.9;
              const license = licenseInfo(info.extmetadata || {});
              if (!validShape || !license) return null;
              return { page, info, license, score: (posterFile ? 100 : 90) + (logoFile ? 5 : 0) };
            }).filter(Boolean).sort((a: any, b: any) => b.score - a.score);
            if (categoryMatches.length) {
              const best = categoryMatches[0];
              return {
                url: best.info.thumburl,
                id: best.page.title,
                page: best.info.descriptionurl,
                attribution: best.license.attribution,
                license: best.license.short,
                licenseUrl: best.license.url
              };
            }
          }
        }
      }
    } catch (error) {
      console.warn("Wikidata/Commons category lookup failed for " + qid + ": " + String(error).slice(0, 160));
    }
  }
  console.log("poster-debug:fallthrough-search",JSON.stringify({qid}));
  const candidates = [...new Set([work.title_ja, work.title, work.title_kana, ...extraTitles].filter((v: unknown) => String(v || "").trim().length >= 3))].slice(0, 6);
  for (const query of candidates) {
    const searchTerms = [query + " logo", query + " poster", query + " key visual", query + " cover", query];
    for (const searchTerm of searchTerms) {
    const params = new URLSearchParams({
      action: "query", format: "json", formatversion: "2",
      generator: "search", gsrsearch: searchTerm, gsrnamespace: "6", gsrlimit: "15",
      prop: "imageinfo", iiprop: "url|size|extmetadata", iiurlwidth: "600",
      origin: "*"
    });
    const response = await fetch("https://commons.wikimedia.org/w/api.php?" + params, {
      headers: { "User-Agent": "ANIXIA/1.0 (https://the-rascal-of-sakurasou.github.io/anixia/; public anime database)" }
    });
    if (response.status === 429) throw new Error("Wikimedia Commons rate limit (429)");
    if (!response.ok) throw new Error("Wikimedia Commons API error: " + response.status);
    const payload = await response.json();
    const pages = Array.isArray(payload?.query?.pages) ? payload.query.pages : [];
    console.log("poster-debug:search-results",JSON.stringify({query,pages:pages.length,titles:pages.slice(0,8).map((p:any)=>p.title)}));
    const target = norm(query);
    const ranked = pages.map((page: any) => {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl || !info?.descriptionurl || !String(info?.mime || "").startsWith("image/") || !String(info.thumburl).startsWith("https://upload.wikimedia.org/")) return null;
      const rawFileName = String(page.title || "").replace(/^File:/i, "").replace(/\.[a-z0-9]{2,5}$/i, "");
      const rawDescription = cleanHtml(info.extmetadata?.ImageDescription?.value);
      const fileName = norm(rawFileName);
      const description = norm(rawDescription);
      const logoFile = /logo|ロゴ/i.test(rawFileName + " " + rawDescription);
      const posterFile = /poster|key[ -]?visual|cover|dvd|blu[ -]?ray|promotional|artwork|ポスター|キービジュアル|表紙/i.test(rawFileName + " " + rawDescription);
      const posterContext = logoFile || posterFile;
      if (!posterContext) return null;
      const exact = fileName === target || description === target;
      const contains = fileName.includes(target) || description.includes(target);
      if (!contains) return null;
      const width = Number(info.width || 0), height = Number(info.height || 0);
      const validShape = logoFile
        ? width >= 200 && height >= 80 && width / height >= 0.5 && width / height <= 6
        : width >= 200 && height >= 280 && width / height >= 0.38 && width / height <= 0.9;
      if (!validShape) return null;
      const license = licenseInfo(info.extmetadata || {});
      const yearMatch = work.release_year && String(page.title).includes(String(work.release_year));
      if (fileName.includes(target) || description.includes(target)) {
        console.log("poster-debug:matched-candidate", JSON.stringify({
          query, title: page.title, width, height, ratio: Number((width / Math.max(height, 1)).toFixed(3)),
          logoFile, posterContext, validShape, licenseShort: cleanHtml(info.extmetadata?.LicenseShortName?.value),
          licenseUrl: cleanHtml(info.extmetadata?.LicenseUrl?.value),
          copyrighted: cleanHtml(info.extmetadata?.Copyrighted?.value),
          metaKeys: Object.keys(info.extmetadata || {}),
          artistMeta: cleanHtml(info.extmetadata?.Artist?.value || info.extmetadata?.Author?.value),
          creditMeta: cleanHtml(info.extmetadata?.Credit?.value || info.extmetadata?.Attribution?.value),
          attribution: license?.attribution || null, accepted: Boolean(validShape && license)
        }));
      }
      if (!license) return null;
      return { page, info, license, score: (exact ? 100 : 90) + (yearMatch ? 10 : 0) + (logoFile ? 20 : 0) + (posterFile && !logoFile ? 10 : 0) };
    }).filter(Boolean).sort((a: any, b: any) => b.score - a.score);
    if (ranked.length && (!ranked[1] || ranked[0].score > ranked[1].score)) {
      const best = ranked[0];
      return {
        url: best.info.thumburl,
        id: best.page.title,
        page: best.info.descriptionurl,
        attribution: best.license.attribution,
        license: best.license.short,
        licenseUrl: best.license.url
      };
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
      .eq("is_published", true)
      .order("release_year", { ascending: false, nullsFirst: false });
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
        poster_license: image.license,
        poster_license_url: image.licenseUrl,
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