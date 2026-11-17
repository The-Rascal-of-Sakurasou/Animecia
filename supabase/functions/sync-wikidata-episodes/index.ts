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

function isJapanese(value: string): boolean {
  return /[\u3000-\u30ff\u3400-\u9fff]/.test(value);
}
function qidFromUri(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.match(/(Q\d+)$/)?.[1] || null;
}
function safeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}
function textValue(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean ? clean.slice(0, max) : null;
}

function episodeQuery(workQid: string): string {
  return `
SELECT DISTINCT ?episode ?episodeLabel ?jaLabel ?originalTitle ?publicationDate ?ordinal ?episodeClass WHERE {
  VALUES ?show { wd:${workQid} }
  VALUES ?episodeClass { wd:Q21191270 wd:Q1983062 wd:Q21664088 }
  {
    ?episode wdt:P361 ?show .
  }
  UNION
  {
    ?season wdt:P361 ?show ;
            wdt:P527 ?episode .
  }
  ?episode wdt:P31 ?episodeClass .
  OPTIONAL {
    ?episode rdfs:label ?jaLabel .
    FILTER(LANG(?jaLabel) = "ja")
  }
  OPTIONAL {
    ?episode wdt:P1476 ?originalTitle .
    FILTER(LANG(?originalTitle) = "ja")
  }
  OPTIONAL { ?episode wdt:P577 ?publicationDate . }
  OPTIONAL {
    ?episode p:P361 ?partStatement .
    ?partStatement pq:P1545 ?partOrdinal .
  }
  OPTIONAL {
    ?episode p:P179 ?seriesStatement .
    ?seriesStatement ps:P179 ?show ;
                     pq:P1545 ?seriesOrdinal .
  }
  OPTIONAL { ?episode wdt:P1545 ?directOrdinal . }
  BIND(COALESCE(?partOrdinal, ?seriesOrdinal, ?directOrdinal) AS ?ordinal)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,en". }
}
ORDER BY ?ordinal ?publicationDate ?episode
LIMIT 500
`;
}

async function fetchEpisodes(workQid: string) {
  const query = episodeQuery(workQid);
  const url = "https://query.wikidata.org/sparql?" + new URLSearchParams({
    query,
    format: "json"
  });
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/sparql-results+json",
        "User-Agent": "ANIXIA/1.0 (https://the-rascal-of-sakurasou.github.io/anixia/)"
      }
    });
    if (response.status === 429) {
      const retry = Number(response.headers.get("Retry-After") || 10);
      await wait(Math.min(60, Math.max(2, retry)) * 1000);
      continue;
    }
    if ([500, 502, 503, 504].includes(response.status) && attempt < 3) {
      await wait((attempt + 1) * 2000);
      continue;
    }
    if (!response.ok) {
      throw new Error("Wikidata Query Service HTTP " + response.status);
    }
    const payload = await response.json();
    return Array.isArray(payload?.results?.bindings) ? payload.results.bindings : [];
  }
  throw new Error("Wikidata Query Service remained unavailable.");
}

function mapEpisodes(bindings: any[]) {
  const byQid = new Map<string, any>();
  for (const binding of bindings) {
    const qid = qidFromUri(binding?.episode?.value);
    if (!qid || byQid.has(qid)) continue;
    const label = textValue(binding?.episodeLabel?.value);
    const jaLabel = textValue(binding?.jaLabel?.value);
    const originalTitle = textValue(binding?.originalTitle?.value);
    const titleJa = jaLabel || originalTitle || (label && isJapanese(label) ? label : null);
    const title = label || titleJa;
    if (!title) continue;
    const ordinal = textValue(binding?.ordinal?.value, 80);
    const date = safeDate(binding?.publicationDate?.value);
    const classQid = qidFromUri(binding?.episodeClass?.value);
    const lowerTitle = (titleJa || title).toLowerCase();
    const kind = lowerTitle.includes("総集編") || lowerTitle.includes("振り返り")
      ? "recap"
      : (lowerTitle.includes("特別編") || lowerTitle.includes("番外編") ? "special" : "regular");
    byQid.set(qid, {
      source_id: qid,
      title,
      title_ja: titleJa,
      episode_number: ordinal,
      aired_at: date,
      episode_kind: kind,
      episode_class_qid: classQid
    });
  }
  return [...byQid.values()].sort((a, b) => {
    const ao = Number(a.episode_number);
    const bo = Number(b.episode_number);
    const aHasOrder = Number.isFinite(ao);
    const bHasOrder = Number.isFinite(bo);
    if (aHasOrder && bHasOrder && ao !== bo) return ao - bo;
    if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;
    if (a.aired_at && b.aired_at && a.aired_at !== b.aired_at) return a.aired_at.localeCompare(b.aired_at);
    if (a.aired_at && !b.aired_at) return -1;
    if (!a.aired_at && b.aired_at) return 1;
    return a.source_id.localeCompare(b.source_id);
  });
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
  if (!url || !anon || !service) return json({ error: "Supabaseのサーバー設定が不足しています。" }, 500);

  try {
    const userClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "ログイン状態を確認できません。" }, 401);
    const { data: isAdmin, error: adminError } = await userClient.rpc("is_anixia_admin");
    if (adminError || isAdmin !== true) return json({ error: "ANIXIA管理者権限が必要です。" }, 403);

    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: source, error: sourceError } = await admin.from("catalog_sources")
      .select("rights_review_status,is_enabled")
      .eq("code", "wikidata")
      .single();
    if (sourceError) throw sourceError;
    if (!source?.is_enabled || source.rights_review_status !== "approved") {
      return json({ error: "Wikidataの利用承認が有効ではないため、同期を停止しました。" }, 423);
    }

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "preview" ? "preview" : "sync";
    const limit = Math.min(10, Math.max(1, Math.floor(Number(body?.limit) || 8)));
    const { data: works, error: worksError } = await admin.from("anime")
      .select("id,title,title_ja,source_id,episode_count,no_episodes")
      .eq("source", "wikidata")
      .eq("is_published", true)
      .gt("episode_count", 0)
      .order("title_ja", { ascending: true })
      .limit(100);
    if (worksError) throw worksError;

    const candidates = (works || []).filter((work: any) => !work.no_episodes).slice(0, limit);
    const run = mode === "sync"
      ? await admin.from("catalog_sync_runs").insert({
          source: "wikidata-episodes",
          status: "running",
          pages_requested: 0,
          records_seen: 0,
          records_inserted_or_updated: 0
        }).select("id").single()
      : { data: null, error: null };
    if (run.error) throw run.error;

    let queriesRequested = 0;
    let recordsSeen = 0;
    let inserted = 0;
    const results: any[] = [];
    try {
      for (let index = 0; index < candidates.length; index++) {
        const work = candidates[index];
        const workQid = String(work.source_id || "");
        if (!/^Q\d+$/.test(workQid)) continue;

        const { data: existingRows, error: existingError } = await admin.from("episodes")
          .select("id,source,source_id,episode_order")
          .eq("anime_id", work.id)
          .order("episode_order", { ascending: true });
        if (existingError) throw existingError;
        const existing = existingRows || [];
        const otherSourceRows = existing.filter((row: any) => row.source !== "wikidata");
        if (otherSourceRows.length) {
          results.push({
            workId: workQid,
            title: work.title_ja || work.title,
            status: "skipped_existing_other_source",
            existingEpisodes: existing.length,
            candidates: 0,
            inserted: 0
          });
          continue;
        }

        const bindings = await fetchEpisodes(workQid);
        queriesRequested++;
        recordsSeen += bindings.length;
        const mapped = mapEpisodes(bindings);
        const existingIds = new Set(existing.filter((row: any) => row.source === "wikidata").map((row: any) => String(row.source_id)));
        const newItems = mapped.filter(item => !existingIds.has(item.source_id));
        const maxOrder = existing.reduce((max: number, row: any) => Math.max(max, Number(row.episode_order) || 0), 0);
        const now = new Date().toISOString();
        const rows = newItems.map((item, index) => ({
          anime_id: work.id,
          source: "wikidata",
          source_id: item.source_id,
          episode_number: item.episode_number,
          episode_order: maxOrder + index + 1,
          episode_kind: item.episode_kind,
          title: item.title,
          title_ja: item.title_ja,
          aired_at: item.aired_at,
          synopsis: null,
          duration_seconds: null,
          is_published: false,
          source_synced_at: now
        }));

        if (mode === "sync" && rows.length) {
          const { error: saveError } = await admin.from("episodes").upsert(rows, {
            onConflict: "source,source_id",
            ignoreDuplicates: true
          });
          if (saveError) throw saveError;
          inserted += rows.length;

          const { data: savedRows, error: savedError } = await admin.from("episodes")
            .select("id,source_id")
            .eq("anime_id", work.id)
            .eq("source", "wikidata")
            .in("source_id", rows.map((row: any) => row.source_id));
          if (savedError) throw savedError;
          const externalRows = (savedRows || []).map((row: any) => ({
            episode_id: row.id,
            source: "wikidata",
            external_id: row.source_id,
            source_url: "https://www.wikidata.org/wiki/" + row.source_id,
            last_verified_at: now
          }));
          if (externalRows.length) {
            const { error: externalError } = await admin.from("episode_external_ids").upsert(externalRows, {
              onConflict: "source,external_id"
            });
            if (externalError) throw externalError;
          }
        }

        results.push({
          workId: workQid,
          title: work.title_ja || work.title,
          status: rows.length ? (mode === "preview" ? "preview" : "imported_unpublished") : "no_new_episodes",
          existingEpisodes: existing.length,
          candidates: mapped.length,
          newCandidates: rows.length,
          inserted: mode === "preview" ? 0 : rows.length,
          sourceUrl: "https://www.wikidata.org/wiki/" + workQid
        });
        if (index < candidates.length - 1) await wait(1100);
      }

      if (mode === "sync" && run.data?.id) {
        const { error: finishError } = await admin.from("catalog_sync_runs").update({
          finished_at: new Date().toISOString(),
          status: "succeeded",
          pages_requested: queriesRequested,
          records_seen: recordsSeen,
          records_inserted_or_updated: inserted
        }).eq("id", run.data.id);
        if (finishError) throw finishError;
      }
      return json({
        mode,
        status: mode === "preview" ? "preview" : "succeeded",
        worksChecked: results.length,
        queriesRequested,
        recordsSeen,
        recordsInserted: mode === "preview" ? 0 : inserted,
        results,
        note: "All imported episodes remain unpublished. Review each episode in the ANIXIA admin episode queue before publication."
      });
    } catch (error) {
      if (mode === "sync" && run.data?.id) {
        await admin.from("catalog_sync_runs").update({
          finished_at: new Date().toISOString(),
          status: inserted > 0 ? "partial" : "failed",
          pages_requested: queriesRequested,
          records_seen: recordsSeen,
          records_inserted_or_updated: inserted,
          error_message: String(error).slice(0, 1000)
        }).eq("id", run.data.id);
      }
      throw error;
    }
  } catch (error) {
    console.error("ANIXIA Wikidata episode sync failed:", error);
    return json({ error: "Wikidataエピソード同期に失敗しました。管理ログを確認してください。" }, 500);
  }
});
