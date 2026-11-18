import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

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
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const WIKIDATA = "https://www.wikidata.org/wiki/";
const USER_AGENT = "ANIXIA/1.0 (https://the-rascal-of-sakurasou.github.io/anixia/; structured metadata sync)";
const SOURCE = "wikidata";

type AnyRecord = Record<string, any>;

function qid(value: unknown): string | null {
  return typeof value === "string" && /^Q[1-9]\d*$/.test(value) ? value : null;
}
function claimIds(entity: AnyRecord, property: string): string[] {
  const claims = Array.isArray(entity?.claims?.[property]) ? entity.claims[property] : [];
  return [...new Set(claims.map((claim: AnyRecord) => qid(claim?.mainsnak?.datavalue?.value?.id)).filter(Boolean))] as string[];
}
function claimText(entity: AnyRecord, property: string): string | null {
  const claims = Array.isArray(entity?.claims?.[property]) ? entity.claims[property] : [];
  for (const claim of claims) {
    const value = claim?.mainsnak?.datavalue?.value;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}
function claimNumber(entity: AnyRecord, property: string): number | null {
  const claims = Array.isArray(entity?.claims?.[property]) ? entity.claims[property] : [];
  for (const claim of claims) {
    const raw = claim?.mainsnak?.datavalue?.value?.amount;
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0) return Math.round(value);
  }
  return null;
}
function label(entity: AnyRecord, lang: "ja" | "en"): string | null {
  const value = entity?.labels?.[lang]?.value;
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : null;
}
function aliases(entity: AnyRecord, lang: "ja" | "en"): string[] {
  const values = entity?.aliases?.[lang];
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((v: AnyRecord) => String(v?.value || "").trim()).filter((v: string) => v.length > 0 && v.length <= 500))].slice(0, 30);
}
function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) ? url.toString().slice(0, 2000) : null;
  } catch {
    return null;
  }
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

async function fetchCharacterLinks(workQids: string[]): Promise<{ characterQid: string; workQid: string }[]> {
  if (!workQids.length) return [];
  const values = workQids.map(id => "wd:" + id).join(" ");
  const query = "SELECT DISTINCT ?character ?work WHERE { VALUES ?work { " + values +
    " } ?character wdt:P1441 ?work . } LIMIT 300";
  const url = "https://query.wikidata.org/sparql?" + new URLSearchParams({ query, format: "json" });
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, {
      headers: { "Accept": "application/sparql-results+json", "User-Agent": USER_AGENT }
    });
    if (response.status === 429) {
      await wait(Math.min(60, Math.max(2, Number(response.headers.get("Retry-After") || 10))) * 1000);
      continue;
    }
    if ([500, 502, 503, 504].includes(response.status) && attempt < 3) {
      await wait((attempt + 1) * 2000);
      continue;
    }
    if (!response.ok) throw new Error("Wikidata character query HTTP " + response.status);
    const payload = await response.json();
    const bindings = Array.isArray(payload?.results?.bindings) ? payload.results.bindings : [];
    return bindings.map((b: AnyRecord) => ({
      characterQid: String(b?.character?.value || "").match(/(Q[1-9]\d*)$/)?.[1] || "",
      workQid: String(b?.work?.value || "").match(/(Q[1-9]\d*)$/)?.[1] || ""
    })).filter((x: AnyRecord) => x.characterQid && x.workQid);
  }
  throw new Error("Wikidata character query remained unavailable.");
}

async function fetchEntities(ids: string[]): Promise<Map<string, AnyRecord>> {
  const result = new Map<string, AnyRecord>();
  const unique = [...new Set(ids.filter((v): v is string => Boolean(qid(v))))].slice(0, 500);
  for (let start = 0; start < unique.length; start += 50) {
    const chunk = unique.slice(start, start + 50);
    const params = new URLSearchParams({
      action: "wbgetentities",
      ids: chunk.join("|"),
      props: "labels|aliases|claims",
      languages: "ja|en",
      languagefallback: "1",
      format: "json",
      origin: "*"
    });
    let payload: AnyRecord | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch("https://www.wikidata.org/w/api.php?" + params.toString(), {
        headers: { "User-Agent": USER_AGENT, "Accept": "application/json" }
      });
      if (response.status === 429) {
        await wait(Math.min(60, Math.max(2, Number(response.headers.get("Retry-After") || 10))) * 1000);
        continue;
      }
      if ([500, 502, 503, 504].includes(response.status) && attempt < 3) {
        await wait((attempt + 1) * 1500);
        continue;
      }
      if (!response.ok) throw new Error("Wikidata API HTTP " + response.status);
      payload = await response.json();
      break;
    }
    if (!payload) throw new Error("Wikidata API remained unavailable.");
    for (const [id, entity] of Object.entries(payload.entities || {})) {
      if (qid(id) && entity && typeof entity === "object") result.set(id, entity as AnyRecord);
    }
    if (start + 50 < unique.length) await wait(500);
  }
  return result;
}
async function ensureEntityRows(
  db: any,
  table: string,
  externalTable: string,
  idColumn: string,
  entities: AnyRecord[],
  nameFields: (entity: AnyRecord) => AnyRecord
): Promise<Map<string, string>> {
  const ids = [...new Set(entities.map(e => e.id).filter((v): v is string => Boolean(qid(v))))];
  const map = new Map<string, string>();
  if (!ids.length) return map;

  const external = await db.from(externalTable).select(idColumn + ",external_id")
    .eq("source", SOURCE).in("external_id", ids);
  if (external.error) throw external.error;
  for (const row of external.data || []) map.set(String(row.external_id), String(row[idColumn]));

  const missing = ids.filter(id => !map.has(id));
  if (missing.length) {
    const rows = entities.filter(e => missing.includes(e.id)).map(e => ({
      source: SOURCE, source_id: e.id, ...nameFields(e)
    })).filter(row => typeof row.name === "string" && row.name.trim());
    if (rows.length) {
      const saved = await db.from(table).upsert(rows, {
        onConflict: "source,source_id", ignoreDuplicates: true
      });
      if (saved.error) throw saved.error;
    }
    const found = await db.from(table).select("id,source_id").eq("source", SOURCE).in("source_id", missing);
    if (found.error) throw found.error;
    for (const row of found.data || []) map.set(String(row.source_id), String(row.id));
  }

  const externalRows = [...map.entries()].filter(([externalId]) => ids.includes(externalId)).map(([externalId, entityId]) => ({
    [idColumn]: entityId,
    source: SOURCE,
    external_id: externalId,
    source_url: WIKIDATA + externalId,
    last_verified_at: new Date().toISOString()
  }));
  if (externalRows.length) {
    const savedExternal = await db.from(externalTable).upsert(externalRows, {
      onConflict: "source,external_id", ignoreDuplicates: true
    });
    if (savedExternal.error) throw savedExternal.error;
  }
  return map;
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

    const source = await db.from("catalog_sources").select("rights_review_status,is_enabled").eq("code", SOURCE).single();
    if (source.error) throw source.error;
    if (!source.data?.is_enabled || source.data.rights_review_status !== "approved") {
      return json({ error: "Wikidataの利用承認が有効ではないため、同期を停止しました。" }, 423);
    }

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "preview" ? "preview" : "sync";
    const limit = Math.min(200, Math.max(1, Math.floor(Number(body?.limit) || 100)));
    const workResult = await db.from("anime")
      .select("id,title,title_ja,title_kana,source_id,official_url,official_site_url,episode_count,episodes_count")
      .eq("source", SOURCE).eq("is_published", true).not("source_id", "is", null)
      .order("release_year", { ascending: true }).limit(limit);
    if (workResult.error) throw workResult.error;
    const works = (workResult.data || []).filter((w: AnyRecord) => qid(String(w.source_id || "")));
    if (!works.length) return json({ status: "completed", mode, works: 0, message: "対象作品はありません。" });

    const run = mode === "sync"
      ? await db.from("catalog_sync_runs").insert({
          source: "wikidata-enrichment", status: "running",
          pages_requested: 0, records_seen: 0, records_inserted_or_updated: 0
        }).select("id").single()
      : { data: null, error: null };
    if (run.error) throw run.error;

    try {
      const workQids = works.map((w: AnyRecord) => String(w.source_id));
      const workEntities = await fetchEntities(workQids);
      const characterLinks = await fetchCharacterLinks(workQids);
      const characterQids = [...new Set(characterLinks.map(link => link.characterQid))];
      const characterEntities = await fetchEntities(characterQids);
      for (const [id, entity] of characterEntities.entries()) entity.id = id;
      const relationProps = ["P272", "P57", "P58", "P162", "P86", "P136", "P179", "P155", "P156"];
      const relatedQids = new Set<string>();
      for (const entity of characterEntities.values()) {
        for (const voiceActorId of claimIds(entity, "P725")) relatedQids.add(voiceActorId);
      }
      for (const entity of workEntities.values()) {
        for (const prop of relationProps) for (const id of claimIds(entity, prop)) relatedQids.add(id);
      }
      const relatedEntities = await fetchEntities([...relatedQids]);
      const classQids = new Set<string>();
      for (const id of relatedQids) {
        const entity = relatedEntities.get(id);
        if (entity) for (const classId of claimIds(entity, "P31")) classQids.add(classId);
      }
      const classEntities = await fetchEntities([...classQids]);
      const now = new Date().toISOString();

      const studioEntities: AnyRecord[] = [];
      const organizationEntities: AnyRecord[] = [];
      const peopleById = new Map<string, AnyRecord>();
      const genreById = new Map<string, AnyRecord>();
      const seriesById = new Map<string, AnyRecord>();

      for (const id of relatedQids) {
        const entity = relatedEntities.get(id);
        if (!entity) continue;
        entity.id = id;
        const isProductionCompany = works.some((work: AnyRecord) =>
          claimIds(workEntities.get(String(work.source_id)) || {}, "P272").includes(id)
        );
        if (isProductionCompany) {
          const classNames = claimIds(entity, "P31").map(classId => {
            const classEntity = classEntities.get(classId);
            return [label(classEntity, "en") || "", label(classEntity, "ja") || ""].join(" ");
          }).join(" ").toLowerCase();
          if (/animation studio|anime studio|アニメーションスタジオ|アニメーション制作会社|アニメ制作会社/.test(classNames)) {
            studioEntities.push(entity);
          } else {
            organizationEntities.push(entity);
          }
        }
        if (works.some((work: AnyRecord) => ["P57", "P58", "P162", "P86"].some(prop =>
          claimIds(workEntities.get(String(work.source_id)) || {}, prop).includes(id)
        ))) peopleById.set(id, entity);
        if (works.some((work: AnyRecord) => claimIds(workEntities.get(String(work.source_id)) || {}, "P136").includes(id))) genreById.set(id, entity);
        if (works.some((work: AnyRecord) => claimIds(workEntities.get(String(work.source_id)) || {}, "P179").includes(id))) seriesById.set(id, entity);
      }
      for (const character of characterEntities.values()) {
        for (const voiceActorId of claimIds(character, "P725")) {
          const voiceActor = relatedEntities.get(voiceActorId);
          if (voiceActor) {
            voiceActor.id = voiceActorId;
            peopleById.set(voiceActorId, voiceActor);
          }
        }
      }

      const counts: AnyRecord = {
        externalIds: 0, aliases: 0, officialUrls: 0, episodeCounts: 0,
        studios: 0, organizations: 0, staffLinks: 0, genres: 0, series: 0, relations: 0,
        characters: 0, characterLinks: 0, voiceActorLinks: 0
      };

      if (mode === "sync") {
        const animeExternal = await db.from("anime_external_ids").select("anime_id,external_id")
          .eq("source", SOURCE).in("external_id", workQids);
        if (animeExternal.error) throw animeExternal.error;
        const externalMap = new Map((animeExternal.data || []).map((r: AnyRecord) => [String(r.external_id), String(r.anime_id)]));
        const missingAnimeExternal = works.filter((w: AnyRecord) => !externalMap.has(String(w.source_id))).map((w: AnyRecord) => ({
          anime_id: w.id, source: SOURCE, external_id: String(w.source_id),
          source_url: WIKIDATA + String(w.source_id), is_primary: true, last_verified_at: now
        }));
        if (missingAnimeExternal.length) {
          const saved = await db.from("anime_external_ids").upsert(missingAnimeExternal, {
            onConflict: "source,external_id", ignoreDuplicates: true
          });
          if (saved.error) throw saved.error;
          counts.externalIds = missingAnimeExternal.length;
        }

        const aliasResult = await db.from("anime_titles").select("anime_id,title,language_code,title_type")
          .in("anime_id", works.map((w: AnyRecord) => w.id));
        if (aliasResult.error) throw aliasResult.error;
        const aliasSet = new Set((aliasResult.data || []).map((r: AnyRecord) =>
          [r.anime_id, r.language_code, r.title_type, String(r.title).toLocaleLowerCase()].join("|")
        ));
        const aliasRows: AnyRecord[] = [];
        for (const work of works) {
          const entity = workEntities.get(String(work.source_id));
          if (!entity) continue;
          for (const [lang, values] of [["ja", aliases(entity, "ja")], ["en", aliases(entity, "en")]] as [string, string[]][]) {
            for (const title of values) {
              if (title === work.title || title === work.title_ja || title.length < 2) continue;
              const key = [work.id, lang, "synonym", title.toLocaleLowerCase()].join("|");
              if (aliasSet.has(key)) continue;
              aliasSet.add(key);
              aliasRows.push({ anime_id: work.id, title, language_code: lang, title_type: "synonym", is_primary: false });
            }
          }
        }
        if (aliasRows.length) {
          const saved = await db.from("anime_titles").insert(aliasRows);
          if (saved.error) throw saved.error;
          counts.aliases = aliasRows.length;
        }

        for (const work of works) {
          const entity = workEntities.get(String(work.source_id));
          if (!entity) continue;
          const update: AnyRecord = {};
          const official = safeUrl(claimText(entity, "P856"));
          if (official && !work.official_url && !work.official_site_url) {
            update.official_url = official;
            update.official_site_url = official;
            counts.officialUrls++;
          }
          const episodeCount = claimNumber(entity, "P1113");
          if (episodeCount && !work.episode_count && !work.episodes_count) {
            update.episode_count = episodeCount;
            update.episodes_count = episodeCount;
            counts.episodeCounts++;
          }
          if (Object.keys(update).length) {
            const saved = await db.from("anime").update({ ...update, updated_at: now }).eq("id", work.id);
            if (saved.error) throw saved.error;
          }
        }

        const studioMap = await ensureEntityRows(db, "studios", "studio_external_ids", "studio_id",
          studioEntities, e => ({
            name: label(e, "en") || label(e, "ja"),
            name_ja: label(e, "ja"), name_en: label(e, "en"),
            wikipedia_url: WIKIDATA + e.id
          }));
        const organizationMap = await ensureEntityRows(db, "organizations", "organization_external_ids", "organization_id",
          organizationEntities, e => ({
            name: label(e, "en") || label(e, "ja"),
            name_ja: label(e, "ja"), name_en: label(e, "en"),
            wikipedia_url: WIKIDATA + e.id
          }));
        counts.studios = studioEntities.length;
        counts.organizations = organizationEntities.length;

        for (const work of works) {
          const entity = workEntities.get(String(work.source_id));
          if (!entity) continue;
          const studioIds = claimIds(entity, "P272").map(id => studioMap.get(id)).filter(Boolean);
          if (studioIds.length) {
            const existing = await db.from("anime_studios").select("studio_id,production_role")
              .eq("anime_id", work.id).in("studio_id", studioIds);
            if (existing.error) throw existing.error;
            const set = new Set((existing.data || []).map((r: AnyRecord) => String(r.studio_id) + "|animation"));
            const rows = studioIds.filter(id => !set.has(String(id) + "|animation")).map(id => ({
              anime_id: work.id, studio_id: id, production_role: "animation", display_order: 1
            }));
            if (rows.length) {
              const saved = await db.from("anime_studios").insert(rows);
              if (saved.error) throw saved.error;
            }
          }
          const orgIds = claimIds(entity, "P272").map(id => organizationMap.get(id)).filter(Boolean);
          if (orgIds.length) {
            const existing = await db.from("anime_organization_staff").select("organization_id")
              .eq("anime_id", work.id).eq("role", "制作会社").in("organization_id", orgIds);
            if (existing.error) throw existing.error;
            const set = new Set((existing.data || []).map((r: AnyRecord) => String(r.organization_id)));
            const rows = orgIds.filter(id => !set.has(String(id))).map(id => ({
              anime_id: work.id, organization_id: id,
              role: "制作会社", role_en: "Production company", display_order: 1
            }));
            if (rows.length) {
              const saved = await db.from("anime_organization_staff").insert(rows);
              if (saved.error) throw saved.error;
            }
          }
        }

        const peopleEntities = [...peopleById.values()];
        const peopleMap = await ensureEntityRows(db, "people", "people_external_ids", "person_id",
          peopleEntities, e => ({
            name: label(e, "en") || label(e, "ja"),
            name_ja: label(e, "ja"), name_en: label(e, "en"),
            wikipedia_url: WIKIDATA + e.id
          }));
        const characterRows = [...characterEntities.entries()].map(([id, entity]) => {
          entity.id = id;
          return entity;
        });
        const characterMap = await ensureEntityRows(db, "characters", "character_external_ids", "character_id",
          characterRows, e => ({
            name: label(e, "en") || label(e, "ja"),
            name_ja: label(e, "ja"), name_en: label(e, "en")
          }));
        counts.characters = characterMap.size;
        const characterLinkRows: AnyRecord[] = [];
        const existingCharacterLinks = await db.from("anime_characters").select("anime_id,character_id")
          .in("anime_id", works.map((w: AnyRecord) => w.id));
        if (existingCharacterLinks.error) throw existingCharacterLinks.error;
        const characterLinkSet = new Set((existingCharacterLinks.data || []).map((r: AnyRecord) =>
          [r.anime_id, r.character_id].join("|")
        ));
        const workIdByQid = new Map(works.map((w: AnyRecord) => [String(w.source_id), String(w.id)]));
        for (const link of characterLinks) {
          const animeId = workIdByQid.get(link.workQid);
          const characterId = characterMap.get(link.characterQid);
          if (!animeId || !characterId) continue;
          const key = [animeId, characterId].join("|");
          if (characterLinkSet.has(key)) continue;
          characterLinkSet.add(key);
          characterLinkRows.push({ anime_id: animeId, character_id: characterId, role: "character" });
        }
        if (characterLinkRows.length) {
          const saved = await db.from("anime_characters").insert(characterLinkRows);
          if (saved.error) throw saved.error;
          counts.characterLinks = characterLinkRows.length;
        }
        const staffRows: AnyRecord[] = [];
        const existingStaff = await db.from("anime_staff").select("anime_id,person_id,role,character_id")
          .in("anime_id", works.map((w: AnyRecord) => w.id));
        if (existingStaff.error) throw existingStaff.error;
        const staffSet = new Set((existingStaff.data || []).map((r: AnyRecord) =>
          [r.anime_id, r.person_id, r.role, r.character_id || ""].join("|")
        ));
        for (const link of characterLinks) {
          const animeId = workIdByQid.get(link.workQid);
          const characterId = characterMap.get(link.characterQid);
          const character = characterEntities.get(link.characterQid);
          if (!animeId || !characterId || !character) continue;
          for (const voiceActorQid of claimIds(character, "P725")) {
            const personId = peopleMap.get(voiceActorQid);
            if (!personId) continue;
            const key = [animeId, personId, "voice_actor", characterId].join("|");
            if (staffSet.has(key)) continue;
            staffSet.add(key);
            staffRows.push({ anime_id: animeId, person_id: personId, role: "voice_actor", character_id: characterId });
            counts.voiceActorLinks++;
          }
        }
        const roleMap: Record<string, string> = { P57: "director", P58: "screenwriter", P162: "producer", P86: "composer" };
        for (const work of works) {
          const entity = workEntities.get(String(work.source_id));
          if (!entity) continue;
          for (const [property, role] of Object.entries(roleMap)) {
            for (const personQid of claimIds(entity, property)) {
              const personId = peopleMap.get(personQid);
              if (!personId) continue;
              const key = [work.id, personId, role, ""].join("|");
              if (staffSet.has(key)) continue;
              staffSet.add(key);
              staffRows.push({ anime_id: work.id, person_id: personId, role });
            }
          }
        }
        if (staffRows.length) {
          const saved = await db.from("anime_staff").insert(staffRows);
          if (saved.error) throw saved.error;
          counts.staffLinks = staffRows.length;
        }

        const genreEntities = [...genreById.values()];
        const genreRows = genreEntities.map(e => ({
          name: label(e, "en") || label(e, "ja"),
          name_ja: label(e, "ja")
        })).filter(r => r.name);
        if (genreRows.length) {
          const saved = await db.from("genres").upsert(genreRows, { onConflict: "name", ignoreDuplicates: true });
          if (saved.error) throw saved.error;
        }
        const genreNames = genreRows.map(r => r.name);
        const genreLookup = genreNames.length
          ? await db.from("genres").select("id,name").in("name", genreNames)
          : { data: [], error: null };
        if (genreLookup.error) throw genreLookup.error;
        const genreIdByName = new Map((genreLookup.data || []).map((r: AnyRecord) => [String(r.name), String(r.id)]));
        const genreQidToId = new Map<string, string>();
        for (const e of genreEntities) {
          const name = label(e, "en") || label(e, "ja");
          const id = name ? genreIdByName.get(name) : null;
          if (id) genreQidToId.set(e.id, id);
        }
        const genreExternalRows = [...genreQidToId.entries()].map(([externalId, genreId]) => ({
          genre_id: genreId, source: SOURCE, external_id: externalId,
          source_url: WIKIDATA + externalId, last_verified_at: now
        }));
        if (genreExternalRows.length) {
          const saved = await db.from("genre_external_ids").upsert(genreExternalRows, {
            onConflict: "source,external_id", ignoreDuplicates: true
          });
          if (saved.error) throw saved.error;
        }
        for (const work of works) {
          const entity = workEntities.get(String(work.source_id));
          if (!entity) continue;
          const ids = claimIds(entity, "P136").map(id => genreQidToId.get(id)).filter(Boolean);
          if (!ids.length) continue;
          const existing = await db.from("anime_genres").select("genre_id").eq("anime_id", work.id).in("genre_id", ids);
          if (existing.error) throw existing.error;
          const set = new Set((existing.data || []).map((r: AnyRecord) => String(r.genre_id)));
          const rows = ids.filter(id => !set.has(String(id))).map(id => ({ anime_id: work.id, genre_id: id }));
          if (rows.length) {
            const saved = await db.from("anime_genres").insert(rows);
            if (saved.error) throw saved.error;
            counts.genres += rows.length;
          }
        }

        const seriesEntities = [...seriesById.values()];
        const seriesMap = await ensureEntityRows(db, "series", "series_external_ids", "series_id",
          seriesEntities, e => ({
            name: label(e, "ja") || label(e, "en"),
            name_en: label(e, "en")
          }));
        counts.series = seriesEntities.length;
        for (const work of works) {
          const entity = workEntities.get(String(work.source_id));
          if (!entity) continue;
          const seriesIds = claimIds(entity, "P179").map(id => seriesMap.get(id)).filter(Boolean);
          if (!seriesIds.length) continue;
          const existing = await db.from("anime_series").select("series_id,series_role")
            .eq("anime_id", work.id).in("series_id", seriesIds);
          if (existing.error) throw existing.error;
          const set = new Set((existing.data || []).map((r: AnyRecord) => String(r.series_id) + "|franchise"));
          const rows = seriesIds.filter(id => !set.has(String(id) + "|franchise")).map(id => ({
            anime_id: work.id, series_id: id, series_role: "franchise", display_order: 1
          }));
          if (rows.length) {
            const saved = await db.from("anime_series").insert(rows);
            if (saved.error) throw saved.error;
          }
        }

        const workByQid = new Map(works.map((w: AnyRecord) => [String(w.source_id), w]));
        const relationRows: AnyRecord[] = [];
        for (const work of works) {
          const entity = workEntities.get(String(work.source_id));
          if (!entity) continue;
          for (const previous of claimIds(entity, "P155")) {
            const target = workByQid.get(previous) as AnyRecord | undefined;
            if (target && target.id !== work.id) relationRows.push({
              anime_id: work.id, related_anime_id: target.id, relation_type: "sequel", display_order: 1
            });
          }
          for (const next of claimIds(entity, "P156")) {
            const target = workByQid.get(next) as AnyRecord | undefined;
            if (target && target.id !== work.id) relationRows.push({
              anime_id: work.id, related_anime_id: target.id, relation_type: "prequel", display_order: 1
            });
          }
        }
        if (relationRows.length) {
          const unique = [...new Map(relationRows.map(r => [[r.anime_id, r.related_anime_id, r.relation_type].join("|"), r])).values()];
          const saved = await db.from("anime_relations").upsert(unique, {
            onConflict: "anime_id,related_anime_id,relation_type", ignoreDuplicates: true
          });
          if (saved.error) throw saved.error;
          counts.relations = unique.length;
        }
      }

      if (mode === "sync" && run.data?.id) {
        const finished = await db.from("catalog_sync_runs").update({
          finished_at: new Date().toISOString(), status: "succeeded",
          pages_requested: 1, records_seen: works.length,
          records_inserted_or_updated: Object.values(counts).reduce((sum: number, value: any) => sum + Number(value || 0), 0),
          error_message: null
        }).eq("id", run.data.id);
        if (finished.error) throw finished.error;
      }
      return json({
        status: "completed", mode, worksProcessed: works.length,
        counts,
        source: "Wikidata structured data (CC0)",
        note: "Only missing or source-linked structured fields are added. Existing manual values and publication states are preserved. Prose descriptions and unlicensed images are not imported."
      });
    } catch (error) {
      if (mode === "sync" && run.data?.id) {
        await db.from("catalog_sync_runs").update({
          finished_at: new Date().toISOString(), status: "failed",
          error_message: String(error).slice(0, 1000)
        }).eq("id", run.data.id);
      }
      throw error;
    }
  } catch (error) {
    console.error("ANIXIA Wikidata enrichment failed:", error);
    return json({ error: "Wikidata追加情報の同期に失敗しました。Edge Functionログを確認してください。" }, 500);
  }
});