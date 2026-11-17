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

function textOrNull(value: unknown, max = 2000): string | null {
  if (typeof value !== "string") return null;
  const valueTrimmed = value.trim();
  return valueTrimmed ? valueTrimmed.slice(0, max) : null;
}
function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
function uniqueBySourceId<T extends { source_id: string }>(rows: T[]): T[] {
  return [...new Map(rows.map(row => [row.source_id, row])).values()];
}

async function annictGet(path: string, params: URLSearchParams, token: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch("https://api.annict.com" + path + "?" + params.toString(), {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
        "User-Agent": "ANIXIA/1.0 (https://the-rascal-of-sakurasou.github.io/anixia/)"
      }
    });
    if (response.status === 429) {
      const retry = Number(response.headers.get("Retry-After") || "5");
      await wait(Math.min(120, Math.max(1, retry)) * 1000);
      continue;
    }
    if ([500, 502, 503, 504].includes(response.status) && attempt < 3) {
      await wait((attempt + 1) * 1500);
      continue;
    }
    if (!response.ok) {
      const details = await response.text();
      throw new Error("Annict " + path + " HTTP " + response.status + ": " + details.slice(0, 250));
    }
    const payload = await response.json();
    const remaining = Number(response.headers.get("RateLimit-Remaining"));
    const reset = Number(response.headers.get("RateLimit-Reset"));
    if (Number.isFinite(remaining) && remaining <= 5 && Number.isFinite(reset) && reset > 0) {
      await wait(Math.min(120, reset + 1) * 1000);
    }
    return payload;
  }
  throw new Error("Annict API rate limit or temporary server error persisted.");
}

async function fetchWorkCollection(path: string, key: string, workId: string, token: string) {
  const all: any[] = [];
  let page = 1;
  let pages = 0;
  while (page && pages < 4) {
    const params = new URLSearchParams({
      filter_work_id: workId,
      page: String(page),
      per_page: "50",
      sort_id: "asc"
    });
    const payload = await annictGet(path, params, token);
    const items = Array.isArray(payload[key]) ? payload[key] : [];
    all.push(...items);
    pages++;
    page = payload.next_page == null ? 0 : Number(payload.next_page);
    if (page && pages < 4) await wait(1100);
  }
  return { items: all, pages };
}

async function getIdMap(admin: any, table: string, ids: string[]) {
  const map = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  for (let offset = 0; offset < unique.length; offset += 100) {
    const part = unique.slice(offset, offset + 100);
    const { data, error } = await admin.from(table)
      .select("id,source_id")
      .eq("source", "annict")
      .in("source_id", part);
    if (error) throw error;
    for (const row of data || []) map.set(String(row.source_id), row.id);
  }
  return map;
}

async function upsertEntities(admin: any, table: string, rows: any[]) {
  const clean = uniqueBySourceId(rows.filter(row => row.source_id && row.name));
  for (let offset = 0; offset < clean.length; offset += 100) {
    const { error } = await admin.from(table).upsert(clean.slice(offset, offset + 100), {
      onConflict: "source,source_id"
    });
    if (error) throw error;
  }
}

async function upsertExternalIds(admin: any, table: string, fk: string, idMap: Map<string, string>, ids: string[], baseUrl: string) {
  const rows = [...new Set(ids.filter(Boolean))].flatMap(externalId => {
    const localId = idMap.get(externalId);
    return localId ? [{ [fk]: localId, source: "annict", external_id: externalId, source_url: baseUrl + externalId, last_verified_at: new Date().toISOString() }] : [];
  });
  for (let offset = 0; offset < rows.length; offset += 100) {
    const { error } = await admin.from(table).upsert(rows.slice(offset, offset + 100), {
      onConflict: "source,external_id"
    });
    if (error) throw error;
  }
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
  const token = Deno.env.get("ANNICT_ACCESS_TOKEN");
  if (!url || !anon || !service) return json({ error: "Supabaseのサーバー設定が不足しています。" }, 500);
  if (!token) return json({ error: "ANNICT_ACCESS_TOKENが未設定です。" }, 503);

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
      .eq("code", "annict")
      .single();
    if (sourceError) throw sourceError;
    if (!source?.is_enabled || source.rights_review_status !== "approved") {
      return json({
        error: "Annictの利用条件確認が完了していないため、同期は停止中です。",
        rightsReviewStatus: source?.rights_review_status || "unknown",
        enabled: Boolean(source?.is_enabled)
      }, 423);
    }

    const body = await req.json().catch(() => ({}));
    const workId = String(body?.workId || "").trim();
    if (!/^\d{1,12}$/.test(workId)) return json({ error: "workIdにはAnnictの数値作品IDを指定してください。" }, 400);

    const { data: anime, error: animeError } = await admin.from("anime")
      .select("id,title,is_published")
      .eq("source", "annict")
      .eq("source_id", workId)
      .maybeSingle();
    if (animeError) throw animeError;
    if (!anime) return json({ error: "対象作品がANIXIAにありません。先に作品基本情報を同期してください。" }, 404);

    const runInsert = await admin.from("catalog_sync_runs").insert({
      source: "annict-details",
      status: "running",
      pages_requested: 0,
      records_seen: 0,
      records_inserted_or_updated: 0
    }).select("id").single();
    if (runInsert.error) throw runInsert.error;
    const runId = runInsert.data.id;

    let pagesRequested = 0;
    let recordsSeen = 0;
    let written = 0;
    try {
      // Keep endpoint requests sequential so the combined importer respects provider rate limits.
      const episodeResult = await fetchWorkCollection("/v1/episodes", "episodes", workId, token);
      await wait(1100);
      const castResult = await fetchWorkCollection("/v1/casts", "casts", workId, token);
      await wait(1100);
      const staffResult = await fetchWorkCollection("/v1/staffs", "staffs", workId, token);
      pagesRequested = episodeResult.pages + castResult.pages + staffResult.pages;
      const episodes = episodeResult.items;
      const casts = castResult.items;
      const staffs = staffResult.items;
      recordsSeen = episodes.length + casts.length + staffs.length;

      const episodeRows = episodes.flatMap((ep: any, index: number) => {
        if (ep.id == null) return [];
        const order = Number(ep.sort_number || ep.number || index + 1);
        if (!Number.isInteger(order) || order < 1) return [];
        const episodeTitle = textOrNull(ep.title, 500);
        const numberText = textOrNull(ep.number_text || ep.number, 50);
        return [{
          anime_id: anime.id,
          source: "annict",
          source_id: String(ep.id),
          episode_number: numberText || String(order),
          episode_order: order,
          episode_kind: "regular",
          title: episodeTitle,
          title_ja: episodeTitle,
          is_published: false,
          source_synced_at: new Date().toISOString()
        }];
      });
      for (let offset = 0; offset < episodeRows.length; offset += 100) {
        const { error } = await admin.from("episodes").upsert(episodeRows.slice(offset, offset + 100), {
          onConflict: "source,source_id"
        });
        if (error) throw error;
      }
      written += episodeRows.length;

      // Save the provider's work title and kana as searchable aliases without overwriting curated titles.
      const { data: existingTitles, error: titleReadError } = await admin.from("anime_titles")
        .select("title,language_code,title_type").eq("anime_id", anime.id);
      if (titleReadError) throw titleReadError;
      const knownTitles = new Set((existingTitles || []).map((row: any) =>
        String(row.title).trim().toLocaleLowerCase("ja") + "|" + row.language_code + "|" + row.title_type
      ));
      const workTitleRows = [
        { title: anime.title, language_code: /[\\u3000-\\u30ff\\u3400-\\u9fff]/.test(anime.title) ? "ja" : "en", title_type: "main", is_primary: true },
      ];
      const { data: workSource, error: workSourceError } = await admin.from("anime")
        .select("title_kana").eq("id", anime.id).single();
      if (workSourceError) throw workSourceError;
      if (workSource?.title_kana) workTitleRows.push({
        title: workSource.title_kana, language_code: "ja", title_type: "kana", is_primary: false
      });
      const missingTitles = workTitleRows.filter((row: any) => !knownTitles.has(
        row.title.trim().toLocaleLowerCase("ja") + "|" + row.language_code + "|" + row.title_type
      )).map((row: any) => ({ anime_id: anime.id, ...row }));
      if (missingTitles.length) {
        const { error } = await admin.from("anime_titles").insert(missingTitles);
        if (error) throw error;
      }
      written += missingTitles.length;

      const { data: savedEpisodes, error: savedEpisodesError } = await admin.from("episodes")
        .select("id,source_id").eq("anime_id", anime.id).eq("source", "annict");
      if (savedEpisodesError) throw savedEpisodesError;
      const episodeMap = new Map((savedEpisodes || []).map((row: any) => [String(row.source_id), row.id]));
      const episodeIds = episodeRows.map((row: any) => row.source_id);
      await upsertExternalIds(admin, "episode_external_ids", "episode_id", episodeMap, episodeIds, "https://annict.com/episodes/");

      const peopleRows: any[] = [];
      const characterRows: any[] = [];
      const organizationRows: any[] = [];
      const seriesRows: any[] = [];
      const characterSeriesPairs = new Map<string, string>();
      for (const cast of casts) {
        if (cast.person?.id != null && textOrNull(cast.person.name)) {
          const p = cast.person;
          peopleRows.push({
            source: "annict", source_id: String(p.id),
            name: textOrNull(p.name, 300), name_ja: textOrNull(p.name, 300),
            name_kana: textOrNull(p.name_kana, 300), name_en: textOrNull(p.name_en, 300),
            nickname: textOrNull(p.nickname, 300), nickname_en: textOrNull(p.nickname_en, 300),
            official_url: safeHttpUrl(p.url), wikipedia_url: safeHttpUrl(p.wikipedia_url),
            birthday: textOrNull(p.birthday, 30), person_type: "person"
          });
        }
        if (cast.character?.id != null && textOrNull(cast.character.name)) {
          const c = cast.character;
          characterRows.push({
            source: "annict", source_id: String(c.id),
            name: textOrNull(c.name, 300), name_ja: textOrNull(c.name, 300),
            name_kana: textOrNull(c.name_kana, 300), name_en: textOrNull(c.name_en, 300),
            nickname: textOrNull(c.nickname, 500), nickname_en: textOrNull(c.nickname_en, 500),
            description: textOrNull(c.description, 4000), description_en: textOrNull(c.description_en, 4000)
          });
          if (c.series?.id != null && textOrNull(c.series.name)) {
            const s = c.series;
            characterSeriesPairs.set(String(c.id), String(s.id));
            seriesRows.push({
              source: "annict", source_id: String(s.id),
              name: textOrNull(s.name, 300), name_ro: textOrNull(s.name_ro, 300),
              name_en: textOrNull(s.name_en, 300)
            });
          }
        }
      }
      for (const staff of staffs) {
        if (staff.person?.id != null && textOrNull(staff.person.name)) {
          const p = staff.person;
          peopleRows.push({
            source: "annict", source_id: String(p.id),
            name: textOrNull(p.name, 300), name_ja: textOrNull(p.name, 300),
            name_kana: textOrNull(p.name_kana, 300), name_en: textOrNull(p.name_en, 300),
            nickname: textOrNull(p.nickname, 300), nickname_en: textOrNull(p.nickname_en, 300),
            official_url: safeHttpUrl(p.url), wikipedia_url: safeHttpUrl(p.wikipedia_url),
            birthday: textOrNull(p.birthday, 30), person_type: "person"
          });
        }
        if (staff.organization?.id != null && textOrNull(staff.organization.name)) {
          const o = staff.organization;
          organizationRows.push({
            source: "annict", source_id: String(o.id),
            name: textOrNull(o.name, 300), name_ja: textOrNull(o.name, 300),
            name_kana: textOrNull(o.name_kana, 300), name_en: textOrNull(o.name_en, 300),
            website_url: safeHttpUrl(o.url), wikipedia_url: safeHttpUrl(o.wikipedia_url)
          });
        }
      }

      await Promise.all([
        upsertEntities(admin, "people", peopleRows),
        upsertEntities(admin, "characters", characterRows),
        upsertEntities(admin, "organizations", organizationRows),
        upsertEntities(admin, "series", seriesRows)
      ]);

      const personMap = await getIdMap(admin, "people", peopleRows.map(row => row.source_id));
      const characterMap = await getIdMap(admin, "characters", characterRows.map(row => row.source_id));
      const organizationMap = await getIdMap(admin, "organizations", organizationRows.map(row => row.source_id));
      const seriesMap = await getIdMap(admin, "series", seriesRows.map(row => row.source_id));

      for (const [characterSourceId, seriesSourceId] of characterSeriesPairs) {
        const characterId = characterMap.get(characterSourceId);
        const seriesId = seriesMap.get(seriesSourceId);
        if (!characterId || !seriesId) continue;
        const { error } = await admin.from("characters")
          .update({ series_id: seriesId })
          .eq("id", characterId);
        if (error) throw error;
      }

      await Promise.all([
        upsertExternalIds(admin, "people_external_ids", "person_id", personMap, peopleRows.map(row => row.source_id), "https://annict.com/people/"),
        upsertExternalIds(admin, "character_external_ids", "character_id", characterMap, characterRows.map(row => row.source_id), "https://annict.com/characters/"),
        upsertExternalIds(admin, "organization_external_ids", "organization_id", organizationMap, organizationRows.map(row => row.source_id), "https://annict.com/organizations/"),
        upsertExternalIds(admin, "series_external_ids", "series_id", seriesMap, seriesRows.map(row => row.source_id), "https://annict.com/series/")
      ]);

      const animeCharacterRows = [...new Set(characterRows.map(row => row.source_id))]
        .flatMap(sourceId => {
          const characterId = characterMap.get(sourceId);
          return characterId ? [{ anime_id: anime.id, character_id: characterId, role: "character" }] : [];
        });
      for (let offset = 0; offset < animeCharacterRows.length; offset += 100) {
        const { error } = await admin.from("anime_characters").upsert(animeCharacterRows.slice(offset, offset + 100), {
          onConflict: "anime_id,character_id"
        });
        if (error) throw error;
      }

      const animeSeriesRows = [...new Set(seriesRows.map(row => row.source_id))]
        .flatMap(sourceId => {
          const seriesId = seriesMap.get(sourceId);
          return seriesId ? [{ anime_id: anime.id, series_id: seriesId, series_role: "main", display_order: 1 }] : [];
        });
      if (animeSeriesRows.length) {
        const { error } = await admin.from("anime_series").upsert(animeSeriesRows, {
          onConflict: "anime_id,series_id,series_role"
        });
        if (error) throw error;
      }

      const orgLinkMap = new Map<string, { organization_id: string; role: string; role_en: string | null; display_order: number }>();
      const studioRows: any[] = [];
      for (const staff of staffs) {
        const organizationId = staff.organization?.id == null ? null : organizationMap.get(String(staff.organization.id));
        const role = textOrNull(staff.role_text || staff.role_other, 200);
        if (!organizationId || !role) continue;
        const key = String(staff.organization.id) + "|" + role;
        orgLinkMap.set(key, {
          organization_id: organizationId,
          role,
          role_en: textOrNull(staff.role_other_en, 200),
          display_order: Math.max(1, Number(staff.sort_number) || 1)
        });
        if (role.includes("アニメーション制作")) {
          const o = staff.organization;
          studioRows.push({
            source: "annict", source_id: String(o.id),
            name: textOrNull(o.name, 300), name_ja: textOrNull(o.name, 300),
            name_kana: textOrNull(o.name_kana, 300), name_en: textOrNull(o.name_en, 300),
            website_url: safeHttpUrl(o.url), wikipedia_url: safeHttpUrl(o.wikipedia_url)
          });
        }
      }

      await upsertEntities(admin, "studios", studioRows);
      const studioMap = await getIdMap(admin, "studios", studioRows.map(row => row.source_id));
      await upsertExternalIds(admin, "studio_external_ids", "studio_id", studioMap, studioRows.map(row => row.source_id), "https://annict.com/organizations/");

      const orgLinks = [...orgLinkMap.values()].map(row => ({
        anime_id: anime.id,
        organization_id: row.organization_id,
        role: row.role,
        role_en: row.role_en,
        display_order: row.display_order
      }));
      for (let offset = 0; offset < orgLinks.length; offset += 100) {
        const { error } = await admin.from("anime_organization_staff").upsert(orgLinks.slice(offset, offset + 100), {
          onConflict: "anime_id,organization_id,role"
        });
        if (error) throw error;
      }

      const studioLinks = [...new Map(studioRows.map(row => [row.source_id, row])).values()]
        .flatMap(row => {
          const studioId = studioMap.get(row.source_id);
          return studioId ? [{
            anime_id: anime.id,
            studio_id: studioId,
            production_role: "animation",
            display_order: 1
          }] : [];
        });
      if (studioLinks.length) {
        const { error } = await admin.from("anime_studios").upsert(studioLinks, {
          onConflict: "anime_id,studio_id,production_role"
        });
        if (error) throw error;
      }

      const relationIds = new Set<string>();
      const relationRows: any[] = [];
      const staffExternalRows: any[] = [];
      const allStaff = [
        ...casts.map((item: any) => ({ ...item, _type: "cast" })),
        ...staffs.map((item: any) => ({ ...item, _type: "staff" }))
      ];
      const { data: existingStaffExt, error: staffExtError } = await admin.from("anime_staff_external_ids")
        .select("anime_staff_id,external_id").eq("source", "annict")
        .in("external_id", allStaff.map((item: any) => item._type + ":" + String(item.id)).filter(Boolean));
      if (staffExtError) throw staffExtError;
      const staffRelationMap = new Map((existingStaffExt || []).map((row: any) => [String(row.external_id), row.anime_staff_id]));

      for (const item of allStaff) {
        if (item.id == null || item.person?.id == null) continue;
        const personId = personMap.get(String(item.person.id));
        if (!personId) continue;
        const characterId = item._type === "cast" && item.character?.id != null
          ? characterMap.get(String(item.character.id)) || null
          : null;
        const role = item._type === "cast"
          ? "声優"
          : (textOrNull(item.role_text || item.role_other, 200) || "スタッフ");
        const externalId = item._type + ":" + String(item.id);
        let relationId = staffRelationMap.get(externalId);
        if (!relationId) {
          const { data: inserted, error } = await admin.from("anime_staff").insert({
            anime_id: anime.id, person_id: personId, role, character_id: characterId
          }).select("id").single();
          if (error) {
            // A matching relation may have been created by a concurrent import.
            let relationQuery = admin.from("anime_staff")
              .select("id").eq("anime_id", anime.id).eq("person_id", personId)
              .eq("role", role);
            relationQuery = characterId
              ? relationQuery.eq("character_id", characterId)
              : relationQuery.is("character_id", null);
            const { data: found, error: findError } = await relationQuery.limit(1).maybeSingle();
            if (findError || !found) throw error;
            relationId = found.id;
          } else {
            relationId = inserted.id;
          }
        }
        relationIds.add(String(relationId));
        staffExternalRows.push({
          anime_staff_id: relationId,
          source: "annict",
          external_id: externalId,
          source_url: "https://annict.com/" + (item._type === "cast" ? "casts/" : "staffs/") + externalId,
          last_verified_at: new Date().toISOString()
        });
      }
      for (let offset = 0; offset < staffExternalRows.length; offset += 100) {
        const { error } = await admin.from("anime_staff_external_ids").upsert(staffExternalRows.slice(offset, offset + 100), {
          onConflict: "source,external_id"
        });
        if (error) throw error;
      }

      written += episodeRows.length + peopleRows.length + characterRows.length +
        organizationRows.length + seriesRows.length + orgLinks.length + studioLinks.length +
        animeCharacterRows.length + animeSeriesRows.length + staffExternalRows.length;

      const update = await admin.from("catalog_sync_runs").update({
        finished_at: new Date().toISOString(),
        status: "completed",
        pages_requested: pagesRequested,
        records_seen: recordsSeen,
        records_inserted_or_updated: written
      }).eq("id", runId);
      if (update.error) throw update.error;

      return json({
        status: "completed",
        workId,
        workTitle: anime.title,
        pagesRequested,
        recordsSeen,
        recordsInsertedOrUpdated: written,
        counts: {
          episodes: episodeRows.length,
          castEntries: casts.length,
          staffEntries: staffs.length,
          people: personMap.size,
          characters: characterMap.size,
          organizations: organizationMap.size,
          studios: studioMap.size,
          series: seriesMap.size
        },
        published: false,
        note: "Imported records remain unpublished. Review the records in the ANIXIA admin workflow before publication."
      });
    } catch (error) {
      await admin.from("catalog_sync_runs").update({
        finished_at: new Date().toISOString(),
        status: written > 0 ? "partial" : "failed",
        pages_requested: pagesRequested,
        records_seen: recordsSeen,
        records_inserted_or_updated: written,
        error_message: String(error).slice(0, 1000)
      }).eq("id", runId);
      throw error;
    }
  } catch (error) {
    console.error("ANIXIA Annict detail sync failed:", error);
    return json({ error: "作品の詳細情報の同期に失敗しました。管理ログを確認してください。" }, 500);
  }
});
