import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { XMLParser } from "npm:fast-xml-parser@4.5.3";

const ALLOWED_ORIGIN = "https://the-rascal-of-sakurasou.github.io";
const HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-anixia-cron-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json; charset=utf-8"
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: HEADERS });
const SOURCE = "syoboi";
const USER_AGENT = "ANIXIA/1.0 (+https://the-rascal-of-sakurasou.github.io/anixia/; catalog metadata sync)";
const API = "https://cal.syoboi.jp/db.php";
const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true });

type Row = Record<string, unknown>;

function normalize(value: unknown): string {
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/gu, "").toLocaleLowerCase("ja");
}
function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
}
function findResultCode(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  for (const [key, value] of Object.entries(node as Row)) {
    if (key === "Result" && value && typeof value === "object") {
      const code = text((value as Row).Code);
      if (code) return code;
    }
    const nested = findResultCode(value);
    if (nested) return nested;
  }
  return null;
}
function collectTitleRows(node: unknown, rows: Row[] = []): Row[] {
  if (!node || typeof node !== "object") return rows;
  if (Array.isArray(node)) {
    for (const item of node) collectTitleRows(item, rows);
    return rows;
  }
  const record = node as Row;
  if (record.TID !== undefined && record.Title !== undefined) rows.push(record);
  for (const [key, value] of Object.entries(record)) {
    if (key !== "Result") collectTitleRows(value, rows);
  }
  return rows;
}
async function fetchTitles(params: Record<string, string>): Promise<Row[]> {
  const url = new URL(API);
  url.searchParams.set("Command", "TitleLookup");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  let lastError = "API request failed";
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept": "application/xml,text/xml" }
    });
    if (response.status === 429) {
      const retry = Number(response.headers.get("Retry-After") || 5);
      await new Promise(resolve => setTimeout(resolve, Math.min(60, Math.max(2, retry)) * 1000));
      continue;
    }
    if ([500, 502, 503, 504].includes(response.status) && attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1500));
      lastError = "Syoboi API HTTP " + response.status;
      continue;
    }
    if (!response.ok) throw new Error("Syoboi API HTTP " + response.status);
    const xml = await response.text();
    let payload: Row;
    try { payload = parser.parse(xml) as Row; }
    catch { throw new Error("Syoboi API returned invalid XML"); }
    const code = findResultCode(payload);
    if (code !== "200") throw new Error("Syoboi API Result/Code=" + (code || "missing"));
    return collectTitleRows(payload);
  }
  throw new Error(lastError);
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, "0")).join("");
}
function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function hasJapaneseReading(value: string): boolean {
  return /[\u3040-\u30ff]/u.test(value) && value.length <= 200;
}
async function loadPublishedAnime(db: any): Promise<Row[]> {
  const result = await db.from("anime")
    .select("id,title,title_ja,title_kana,syobocal_tid")
    .eq("is_published", true)
    .order("title_ja", { ascending: true })
    .range(0, 1999);
  if (result.error) throw result.error;
  return result.data || [];
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin && origin !== ALLOWED_ORIGIN) return json({ error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json({ error: "Supabase server configuration is incomplete." }, 500);

  try {
    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    let authorized = false;
    const cronToken = req.headers.get("x-anixia-cron-token");
    if (cronToken) {
      const stored = await db.from("catalog_sync_secrets").select("secret_hash").eq("id", 1).maybeSingle();
      if (stored.error) throw stored.error;
      const incomingHash = await sha256(cronToken);
      authorized = Boolean(stored.data?.secret_hash) && sameToken(incomingHash, String(stored.data.secret_hash));
    }
    if (!authorized) {
      const auth = req.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) return json({ error: "管理者ログインまたは有効な同期トークンが必要です。" }, 401);
      const userClient = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: auth } }
      });
      const user = await userClient.auth.getUser();
      if (user.error || !user.data.user) return json({ error: "ログイン状態を確認できません。" }, 401);
      const admin = await userClient.rpc("is_anixia_admin");
      if (admin.error || admin.data !== true) return json({ error: "ANIXIA管理者権限が必要です。" }, 403);
    }

    const source = await db.from("catalog_sources")
      .select("rights_review_status,is_enabled").eq("code", SOURCE).maybeSingle();
    if (source.error) throw source.error;
    if (!source.data?.is_enabled || source.data.rights_review_status !== "approved") {
      return json({ error: "しょぼいカレンダーの利用承認が有効ではないため、同期を停止しました。" }, 423);
    }

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "preview" ? "preview" : "sync";
    const anime = await loadPublishedAnime(db);
    const list = await fetchTitles({ TID: "*", Fields: "TID,Title,LastUpdate" });
    const sourceIndex = new Map<string, number[]>();
    for (const item of list) {
      const tid = Number(text(item.TID));
      const key = normalize(item.Title);
      if (!Number.isSafeInteger(tid) || tid <= 0 || !key) continue;
      const values = sourceIndex.get(key) || [];
      values.push(tid);
      sourceIndex.set(key, values);
    }

    const proposed: { anime: Row; tid: number }[] = [];
    let ambiguousSourceTitles = 0;
    let ambiguousAnimeTitles = 0;
    for (const work of anime) {
      const keys = [...new Set([normalize(work.title_ja), normalize(work.title)].filter(Boolean))];
      const matched = new Set<number>();
      for (const key of keys) {
        const tids = sourceIndex.get(key) || [];
        if (tids.length > 1) ambiguousSourceTitles++;
        if (tids.length === 1) matched.add(tids[0]);
      }
      if (matched.size === 1) proposed.push({ anime: work, tid: [...matched][0] });
      else if (matched.size > 1) ambiguousAnimeTitles++;
    }
    const reverse = new Map<number, number>();
    for (const pair of proposed) reverse.set(pair.tid, (reverse.get(pair.tid) || 0) + 1);
    const safeMatches = proposed.filter(pair => reverse.get(pair.tid) === 1 &&
      (!text(pair.anime.syobocal_tid) || text(pair.anime.syobocal_tid) === String(pair.tid)));

    const detailRows: Row[] = [];
    for (let start = 0; start < safeMatches.length; start += 100) {
      if (start > 0) await new Promise(resolve => setTimeout(resolve, 1100));
      const ids = safeMatches.slice(start, start + 100).map(pair => String(pair.tid));
      const details = await fetchTitles({
        TID: ids.join(","),
        Fields: "TID,Title,ShortTitle,TitleYomi,TitleEN,LastUpdate"
      });
      detailRows.push(...details);
    }
    const detailByTid = new Map(detailRows.map(row => [Number(text(row.TID)), row]));
    const preview = safeMatches.slice(0, 12).map(pair => {
      const detail = detailByTid.get(pair.tid) || {};
      return {
        animeTitle: text(pair.anime.title_ja) || text(pair.anime.title),
        syoboiTid: pair.tid,
        titleYomi: text(detail.TitleYomi),
        shortTitle: text(detail.ShortTitle),
        titleEN: text(detail.TitleEN),
        alreadyLinked: text(pair.anime.syobocal_tid) === String(pair.tid)
      };
    });

    if (mode === "preview") {
      return json({
        status: "preview",
        publishedAnime: anime.length,
        syoboiTitles: list.length,
        safeExactMatches: safeMatches.length,
        ambiguousSourceTitles,
        ambiguousAnimeTitles,
        detailRecords: detailRows.length,
        sample: preview,
        writesPerformed: 0
      });
    }

    const run = await db.from("catalog_sync_runs").insert({
      source: "syoboi-titles", status: "running", pages_requested: 1,
      records_seen: anime.length, records_inserted_or_updated: 0
    }).select("id").single();
    if (run.error) throw run.error;

    try {
      const existingTitlesResult = await db.from("anime_titles")
        .select("anime_id,title,language_code,title_type").range(0, 4999);
      if (existingTitlesResult.error) throw existingTitlesResult.error;
      const titleKeys = new Set((existingTitlesResult.data || []).map((row: Row) =>
        [text(row.anime_id), text(row.language_code), text(row.title_type), normalize(row.title)].join("|")
      ));
      let linked = 0;
      let kanaFilled = 0;
      let aliasesInserted = 0;
      for (const pair of safeMatches) {
        const detail = detailByTid.get(pair.tid);
        if (!detail) continue;
        const changes: Row = {};
        const currentTid = text(pair.anime.syobocal_tid);
        if (!currentTid) changes.syobocal_tid = String(pair.tid);
        const reading = text(detail.TitleYomi);
        if (!text(pair.anime.title_kana) && hasJapaneseReading(reading)) {
          changes.title_kana = reading;
        }
        if (Object.keys(changes).length) {
          const updated = await db.from("anime").update(changes).eq("id", pair.anime.id);
          if (updated.error) throw updated.error;
          if (changes.syobocal_tid) linked++;
          if (changes.title_kana) kanaFilled++;
        }
        const candidates = [
          { value: text(detail.ShortTitle), language: "ja", type: "short" },
          { value: text(detail.TitleEN), language: "en", type: "english" }
        ];
        for (const candidate of candidates) {
          const key = [text(pair.anime.id), candidate.language, candidate.type, normalize(candidate.value)].join("|");
          if (!candidate.value || normalize(candidate.value) === normalize(pair.anime.title_ja) ||
              normalize(candidate.value) === normalize(pair.anime.title) || titleKeys.has(key)) continue;
          const inserted = await db.from("anime_titles").insert({
            anime_id: pair.anime.id,
            title: candidate.value.slice(0, 500),
            language_code: candidate.language,
            title_type: candidate.type,
            is_primary: false
          });
          if (inserted.error && inserted.error.code !== "23505") throw inserted.error;
          if (!inserted.error) {
            aliasesInserted++;
            titleKeys.add(key);
          }
        }
      }
      const finishedAt = new Date().toISOString();
      const finished = await db.from("catalog_sync_runs").update({
        finished_at: finishedAt, status: "succeeded",
        records_inserted_or_updated: linked + kanaFilled + aliasesInserted,
        error_message: null
      }).eq("id", run.data.id);
      if (finished.error) throw finished.error;
      const state = await db.from("catalog_sync_state").upsert({
        source: "syoboi-titles", next_offset: 0,
        last_success_at: finishedAt, updated_at: finishedAt
      }, { onConflict: "source" });
      if (state.error) throw state.error;
      return json({
        status: "completed",
        publishedAnime: anime.length,
        syoboiTitles: list.length,
        exactMatches: safeMatches.length,
        linked,
        kanaFilled,
        aliasesInserted,
        ambiguousSourceTitles,
        ambiguousAnimeTitles,
        source: "しょぼいカレンダー TitleLookup",
        note: "Only unique exact normalized-title matches are linked. Existing TIDs and non-empty kana values are preserved."
      });
    } catch (error) {
      await db.from("catalog_sync_runs").update({
        finished_at: new Date().toISOString(), status: "failed",
        error_message: String(error).slice(0, 1000)
      }).eq("id", run.data.id);
      throw error;
    }
  } catch (error) {
    console.error("ANIXIA Syoboi title sync failed:", error);
    return json({ error: "しょぼいカレンダー作品情報の同期に失敗しました。Edge Functionログを確認してください。" }, 500);
  }
});