import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const ORIGIN = "https://the-rascal-of-sakurasou.github.io";
const HEADERS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-anixia-cron-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Vary": "Origin"
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: HEADERS });
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const FORMATS: Record<string, string> = {
  Q63952888: "tv",
  Q20650540: "movie",
  Q220898: "ova",
  Q1047299: "web",
  Q117209498: "movie",
  Q117467240: "web",
  Q11086742: "tv"
};

function currentSeason() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const year = Number(parts.find(p => p.type === "year")?.value);
  const month = Number(parts.find(p => p.type === "month")?.value);
  const season = month <= 3 ? "winter" : month <= 6 ? "spring" : month <= 9 ? "summer" : "autumn";
  const startMonth = { winter: 1, spring: 4, summer: 7, autumn: 10 }[season];
  const endMonth = startMonth + 3;
  const start = `${year}-${String(startMonth).padStart(2, "0")}-01T00:00:00+09:00`;
  const endYear = endMonth > 12 ? year + 1 : year;
  const end = `${endYear}-${String(endMonth > 12 ? endMonth - 12 : endMonth).padStart(2, "0")}-01T00:00:00+09:00`;
  return { year, season, seasonName: `${year}-${season}`, start, end };
}

function buildQuery(limit: number, offset: number, range: ReturnType<typeof currentSeason>) {
  return `
SELECT DISTINCT ?item ?itemLabel ?jaLabel ?date ?episodes ?class ?malId WHERE {
  VALUES ?class { wd:Q63952888 wd:Q20650540 wd:Q220898 wd:Q1047299 wd:Q117209498 wd:Q117467240 wd:Q11086742 }
  ?item wdt:P31 ?class ; wdt:P495 wd:Q17 .
  OPTIONAL { ?item wdt:P580 ?startDate . }
  OPTIONAL { ?item wdt:P577 ?publicationDate . }
  BIND(COALESCE(?startDate, ?publicationDate) AS ?date)
  FILTER(BOUND(?date) && ?date >= "${range.start}"^^xsd:dateTime && ?date < "${range.end}"^^xsd:dateTime)
  FILTER NOT EXISTS {
    ?item wdt:P136/wdt:P279* ?adultGenre .
    VALUES ?adultGenre { wd:Q136926229 wd:Q49148153 wd:Q185529 wd:Q599558 wd:Q2275499 wd:Q16254232 wd:Q2292320 wd:Q172067 }
  }
  OPTIONAL { ?item wdt:P1113 ?episodes . }
  OPTIONAL { ?item rdfs:label ?jaLabel . FILTER(LANG(?jaLabel) = "ja") }
  OPTIONAL { ?item wdt:P4086 ?malId . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,en". }
}
ORDER BY ?date ?item
LIMIT ${limit}
OFFSET ${offset}`;
}

async function fetchPage(limit: number, offset: number, range: ReturnType<typeof currentSeason>) {
  const endpoint = "https://query.wikidata.org/sparql?" + new URLSearchParams({
    query: buildQuery(limit, offset, range),
    format: "json"
  });
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/sparql-results+json",
        "User-Agent": "ANIXIA/1.0 (https://the-rascal-of-sakurasou.github.io/anixia/)"
      }
    });
    if (response.status === 429) {
      await wait(Math.min(60, Math.max(2, Number(response.headers.get("Retry-After") || 10))) * 1000);
      continue;
    }
    if ([500, 502, 503, 504].includes(response.status) && attempt < 3) {
      await wait((attempt + 1) * 2500);
      continue;
    }
    if (!response.ok) throw new Error("Wikidata SPARQL HTTP " + response.status);
    const payload = await response.json();
    return Array.isArray(payload?.results?.bindings) ? payload.results.bindings : [];
  }
  throw new Error("Wikidata remained unavailable after retries.");
}

function mapBindings(bindings: any[], range: ReturnType<typeof currentSeason>) {
  const byQid = new Map<string, any>();
  for (const b of bindings) {
    const qid = String(b?.item?.value || "").match(/(Q\d+)$/)?.[1] || "";
    const label = String(b?.itemLabel?.value || "").trim().slice(0, 500);
    const ja = String(b?.jaLabel?.value || "").trim().slice(0, 500);
    const titleJa = ja || (/[\u3000-\u30ff\u3400-\u9fff]/.test(label) ? label : null);
    const date = String(b?.date?.value || "").match(/^(\d{4}-\d{2}-\d{2})/);
    const cls = String(b?.class?.value || "").match(/(Q\d+)$/)?.[1] || "";
    const episodes = Number(b?.episodes?.value);
    const malId = String(b?.malId?.value || "").trim();
    if (!/^Q\d+$/.test(qid) || !titleJa || !date) continue;
    const releasedOn = date[1];
    const month = Number(releasedOn.slice(5, 7));
    const season = month <= 3 ? "winter" : month <= 6 ? "spring" : month <= 9 ? "summer" : "autumn";
    const releaseYear = Number(releasedOn.slice(0, 4));
    const format = FORMATS[cls] || "other";
    if (!["tv", "movie", "ova", "web"].includes(format)) continue;
    if (!byQid.has(qid)) {
      byQid.set(qid, {
        qid,
        title: titleJa,
        title_ja: titleJa,
        format,
        release_year: releaseYear,
        season,
        season_name: `${releaseYear}-${season}`,
        season_name_text: `${releaseYear}年${({ winter: "冬", spring: "春", summer: "夏", autumn: "秋" } as Record<string, string>)[season]}`,
        released_on: releasedOn,
        episode_count: Number.isInteger(episodes) && episodes > 0 ? episodes : null,
        episodes_count: Number.isInteger(episodes) && episodes > 0 ? episodes : null,
        country_code: "JP",
        malIds: new Set<string>(),
        wikidataUrl: "https://www.wikidata.org/wiki/" + qid
      });
    }
    if (/^\d+$/.test(malId)) byQid.get(qid).malIds.add(malId);
  }
  return [...byQid.values()];
}

async function persist(db: any, works: any[]) {
  if (!works.length) return { created: 0, linked: 0, updated: 0 };
  const qids = works.map(w => w.qid);
  const malIds = [...new Set(works.flatMap(w => [...w.malIds]))];

  const [wikidataResult, malResult] = await Promise.all([
    db.from("anime_external_ids").select("external_id,anime_id")
      .eq("source", "wikidata").in("external_id", qids),
    malIds.length
      ? db.from("anime_external_ids").select("external_id,anime_id")
          .eq("source", "myanimelist").in("external_id", malIds)
      : Promise.resolve({ data: [], error: null })
  ]);
  if (wikidataResult.error || malResult.error) throw wikidataResult.error || malResult.error;

  const idByQid = new Map<string, string>();
  for (const row of wikidataResult.data || []) idByQid.set(String(row.external_id), String(row.anime_id));
  const idByMal = new Map<string, string>();
  for (const row of malResult.data || []) idByMal.set(String(row.external_id), String(row.anime_id));

  const existingQidByAnime = new Set(idByQid.values());
  const inserts: any[] = [];
  const mappings: any[] = [];
  let linked = 0;
  let updated = 0;

  for (const work of works) {
    let animeId = idByQid.get(work.qid);
    if (!animeId) {
      const possible = [...work.malIds].map((id: string) => idByMal.get(id)).filter(Boolean);
      const unique = [...new Set(possible)];
      if (unique.length === 1 && !existingQidByAnime.has(unique[0])) {
        animeId = unique[0];
        linked++;
      }
    }
    if (!animeId) {
      inserts.push({
        source: "wikidata",
        source_id: work.qid,
        title: work.title,
        title_ja: work.title_ja,
        format: work.format,
        release_year: work.release_year,
        season: work.season,
        season_name: work.season_name,
        season_name_text: work.season_name_text,
        released_on: work.released_on,
        episode_count: work.episode_count,
        episodes_count: work.episodes_count,
        country_code: "JP",
        is_published: true,
        source_synced_at: new Date().toISOString()
      });
    } else {
      const update = await db.from("anime").update({
        release_year: work.release_year,
        season: work.season,
        season_name: work.season_name,
        season_name_text: work.season_name_text,
        released_on: work.released_on
      }).eq("id", animeId);
      if (update.error) throw update.error;
      updated++;
      mappings.push({
        anime_id: animeId, source: "wikidata", external_id: work.qid,
        source_url: work.wikidataUrl, is_primary: false, last_verified_at: new Date().toISOString()
      });
      existingQidByAnime.add(animeId);
    }
  }

  if (inserts.length) {
    const saved = await db.from("anime").upsert(inserts, {
      onConflict: "source,source_id", ignoreDuplicates: true
    });
    if (saved.error) throw saved.error;
  }

  const imported = await db.from("anime").select("id,source_id")
    .eq("source", "wikidata").in("source_id", qids);
  if (imported.error) throw imported.error;
  const idByImportedQid = new Map((imported.data || []).map((r: any) => [String(r.source_id), String(r.id)]));

  for (const work of works) {
    const animeId = idByQid.get(work.qid) || idByImportedQid.get(work.qid);
    if (!animeId) continue;
    const current = await db.from("anime").update({
      release_year: work.release_year,
      season: work.season,
      season_name: work.season_name,
      season_name_text: work.season_name_text,
      released_on: work.released_on,
      source_synced_at: new Date().toISOString()
    }).eq("id", animeId);
    if (current.error) throw current.error;
    // Preserve editorial titles and publication state on pre-existing catalogue rows.
    const titleBackfill = await db.from("anime").update({ title_ja: work.title_ja })
      .eq("id", animeId).is("title_ja", null);
    if (titleBackfill.error) throw titleBackfill.error;
    if (!mappings.some((m: any) => m.external_id === work.qid)) {
      mappings.push({
        anime_id: animeId, source: "wikidata", external_id: work.qid,
        source_url: work.wikidataUrl, is_primary: !idByQid.has(work.qid),
        last_verified_at: new Date().toISOString()
      });
    }
  }

  if (mappings.length) {
    const mapped = await db.from("anime_external_ids").upsert(mappings, {
      onConflict: "source,external_id", ignoreDuplicates: true
    });
    if (mapped.error) throw mapped.error;
  }
  return { created: inserts.length, linked, updated };
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, "0")).join("");
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
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    let authorized = false;
    const cronToken = req.headers.get("x-anixia-cron-token");
    if (cronToken) {
      const secret = await admin.from("catalog_sync_secrets").select("secret_hash").eq("id", 1).maybeSingle();
      if (secret.error) throw secret.error;
      authorized = Boolean(secret.data?.secret_hash) && (await sha256(cronToken)) === secret.data.secret_hash;
    }
    if (!authorized) {
      const auth = req.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) return json({ error: "Admin login or a valid sync token is required." }, 401);
      const userClient = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: auth } }
      });
      const user = await userClient.auth.getUser();
      if (user.error || !user.data.user) return json({ error: "Login could not be verified." }, 401);
      const check = await userClient.rpc("is_anixia_admin");
      if (check.error || check.data !== true) return json({ error: "ANIXIA admin permission is required." }, 403);
    }

    const source = await admin.from("catalog_sources")
      .select("rights_review_status,is_enabled").eq("code", "wikidata").single();
    if (source.error) throw source.error;
    if (!source.data.is_enabled || source.data.rights_review_status !== "approved") {
      return json({ error: "Wikidata source is not approved and enabled." }, 423);
    }

    const range = currentSeason();
    const body = await req.json().catch(() => ({}));
    if (body?.mode === "preview") {
      const bindings = await fetchPage(100, 0, range);
      const works = mapBindings(bindings, range);
      return json({
        mode: "preview", season: range.seasonName, start: range.start, end: range.end,
        recordsSeen: bindings.length,
        candidates: works.map(w => ({
          qid: w.qid, title: w.title, format: w.format, releasedOn: w.released_on,
          season: w.season_name, malIds: [...w.malIds]
        }))
      });
    }

    const run = await admin.from("catalog_sync_runs").insert({
      source: "wikidata", status: "running", pages_requested: 0,
      records_seen: 0, records_inserted_or_updated: 0
    }).select("id").single();
    if (run.error) throw run.error;

    try {
      let offset = 0, pages = 0, recordsSeen = 0;
      let created = 0, linked = 0, updated = 0;
      const all = new Map<string, any>();
      for (let page = 0; page < 5; page++) {
        const bindings = await fetchPage(100, offset, range);
        pages++;
        recordsSeen += bindings.length;
        for (const work of mapBindings(bindings, range)) all.set(work.qid, work);
        if (bindings.length < 100) break;
        offset += 100;
        await wait(1200);
      }
      const works = [...all.values()];
      const saved = await persist(admin, works);
      created += saved.created;
      linked += saved.linked;
      updated += saved.updated;
      const finishedAt = new Date().toISOString();
      const finish = await admin.from("catalog_sync_runs").update({
        finished_at: finishedAt, status: "succeeded", pages_requested: pages,
        records_seen: recordsSeen, records_inserted_or_updated: created + updated
      }).eq("id", run.data.id);
      if (finish.error) throw finish.error;
      return json({
        status: "completed", season: range.seasonName, recordsSeen,
        candidates: works.length, created, linkedToExisting: linked, updated,
        pagesRequested: pages
      });
    } catch (error) {
      await admin.from("catalog_sync_runs").update({
        finished_at: new Date().toISOString(), status: "failed",
        error_message: String(error).slice(0, 1000)
      }).eq("id", run.data.id);
      throw error;
    }
  } catch (error) {
    console.error("ANIXIA seasonal sync failed:", error);
    return json({ error: "Seasonal anime synchronization failed. Check Edge Function logs." }, 500);
  }
});
