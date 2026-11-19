/* ANIXIA public client. Only the Supabase publishable key belongs in browser code. */
(function (w) {
  "use strict";
  const URL = "https://trvnxggqzlhqdhoyiliy.supabase.co";
  const KEY = "sb_publishable_UiVRBLbMIAy-1GZqVY35Zw_uEp-W_GJ";
  let instance;

  function getClient() {
    if (instance) return instance;
    if (!w.supabase || typeof w.supabase.createClient !== "function") {
      throw new Error("Supabase SDK is not loaded.");
    }
    instance = w.supabase.createClient(URL, KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: w.sessionStorage,
        storageKey: "anixia-auth-session"
      }
    });
    return instance;
  }

  const safeTerm = value => String(value || "").trim().replace(/[%,()]/g, " ").replace(/\s+/g, " ").slice(0, 80);

  async function attachEnglishTitles(rows) {
    const items = Array.isArray(rows) ? rows : [];
    const ids = [...new Set(items.map(row => row?.id).filter(Boolean))];
    if (!ids.length) return items;
    const result = await getClient().from("anime_titles")
      .select("anime_id,title,title_type,is_primary")
      .in("anime_id", ids)
      .eq("language_code", "en")
      .in("title_type", ["english", "main", "synonym"])
      .order("title_type", { ascending: true })
      .order("is_primary", { ascending: false })
      .limit(1000);
    if (result.error) {
      console.warn("English title aliases unavailable", result.error);
      return items;
    }
    const byId = new Map();
    for (const row of result.data || []) {
      const title = String(row.title || "").trim();
      const hasJapanese = [...title].some(char => { const code = char.codePointAt(0); return (code >= 0x3040 && code <= 0x30ff) || (code >= 0x3400 && code <= 0x9fff); });
      if (!title || hasJapanese) continue;
      if (!byId.has(row.anime_id)) byId.set(row.anime_id, title);
    }
    return items.map(row => ({ ...row, title_en: byId.get(row.id) || row.title_en || null }));
  }

  async function attachPosterCredits(rows) {
    const items = Array.isArray(rows) ? rows : [];
    const ids = [...new Set(items.filter(work => work?.poster_url).map(work => work.id).filter(Boolean))];
    if (!ids.length) return items;
    const result = await getClient().rpc("get_public_poster_credits", { p_anime_ids: ids });
    if (result.error) {
      console.warn("poster credits unavailable; uncredited artwork will stay hidden", result.error);
      return items;
    }
    const credits = new Map((result.data || []).map(item => [item.anime_id, item]));
    return items.map(work => ({ ...work, poster_credit: credits.get(work.id) || work.poster_credit || null }));
  }

  async function listAnime(options = {}) {
    const db = getClient();
    const limit = Math.min(Math.max(Number(options.limit) || 24, 1), 50);
    const offset = Math.max(Number(options.offset) || 0, 0);
    const result = await db.rpc("search_public_anime", {
      p_query: safeTerm(options.query) || null,
      p_genre_id: options.genreId || null,
      p_year: options.year ? Number(options.year) : null,
      p_season: options.season || null,
      p_format: options.format || null,
      p_studio_id: options.studioId || null,
      p_sort: options.sort || "newest",
      p_limit: limit,
      p_offset: offset,
      p_tag_ids: Array.isArray(options.tagIds) ? [...new Set(options.tagIds)].slice(0, 30) : [],
      p_person_query: safeTerm(options.personQuery) || null,
      p_character_query: safeTerm(options.characterQuery) || null
    });
    if (result.error) throw result.error;
    const titled = await attachEnglishTitles(result.data || []);
    const data = await attachPosterCredits(titled);
    return { data, count: Number(data[0]?.total_count || 0) };
  }

  async function suggestCatalog(query, type = "all", limit = 10) {
    const term = safeTerm(query);
    if (term.length < 2) return [];
    const result = await getClient().rpc("suggest_public_catalog", {
      p_query: term,
      p_type: type,
      p_limit: Math.min(Math.max(Number(limit) || 10, 1), 10)
    });
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function getAnime(id) {
    const result = await getClient().rpc("get_public_anime_detail", { p_anime_id: id });
    if (result.error) throw result.error;
    if (!result.data) return null;
    const related = await attachEnglishTitles(result.data.related_works || []);
    const [work] = await attachEnglishTitles([{ ...result.data, related_works: related }]);
    return work;
  }

  async function getGenres() {
    const result = await getClient().from("genres").select("id,name,name_ja,description,description_en").order("name_ja", { ascending: true });
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function getStudios() {
    const result = await getClient().from("studios").select("id,name,name_ja").order("name_ja", { ascending: true }).limit(500);
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function getTags() {
    const result = await getClient().from("tags").select("id,name,name_ja,description,description_en").order("name_ja", { ascending: true }).limit(500);
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function getCatalogCount() {
    const result = await getClient().rpc("search_public_anime", {
      p_sort: "newest", p_limit: 1, p_offset: 0
    });
    if (result.error) throw result.error;
    return Number(result.data?.[0]?.total_count || 0);
  }

  async function getPublicAnimeByIds(ids) {
    const uniqueIds = [...new Set((ids || []).filter(Boolean))].slice(0, 100);
    if (!uniqueIds.length) return [];
    const result = await getClient().rpc("get_public_anime_by_ids", { p_anime_ids: uniqueIds });
    if (result.error) throw result.error;
    const titled = await attachEnglishTitles(result.data || []);
    return attachPosterCredits(titled);
  }

  async function getUser() {
    const result = await getClient().auth.getUser();
    if (result.error) throw result.error;
    return result.data.user || null;
  }

  async function getUserAnimeState(animeId, userId) {
    const db = getClient();
    const [favorite, watch, rating] = await Promise.all([
      db.from("favorites").select("anime_id").eq("anime_id", animeId).eq("user_id", userId).maybeSingle(),
      db.from("watch_entries").select("status,episodes_watched,notes").eq("anime_id", animeId).eq("user_id", userId).maybeSingle(),
      db.from("ratings").select("score").eq("anime_id", animeId).eq("user_id", userId).maybeSingle()
    ]);
    if (favorite.error || watch.error || rating.error) throw favorite.error || watch.error || rating.error;
    return { favorite: !!favorite.data, watch: watch.data || null, rating: rating.data || null };
  }

  async function toggleFavorite(animeId, userId, currentlyFavorite) {
    const db = getClient();
    if (currentlyFavorite) {
      const result = await db.from("favorites").delete().eq("anime_id", animeId).eq("user_id", userId);
      if (result.error) throw result.error;
      return false;
    }
    const result = await db.from("favorites").insert({ anime_id: animeId, user_id: userId });
    if (result.error) throw result.error;
    return true;
  }

  async function saveWatchEntry(animeId, userId, status, episodesWatched) {
    const result = await getClient().from("watch_entries").upsert({
      anime_id: animeId, user_id: userId, status,
      episodes_watched: Math.max(0, Number(episodesWatched) || 0)
    }, { onConflict: "user_id,anime_id" });
    if (result.error) throw result.error;
    return true;
  }

  async function saveRating(animeId, userId, score) {
    const result = await getClient().from("ratings").upsert({
      anime_id: animeId, user_id: userId, score: Number(score)
    }, { onConflict: "user_id,anime_id" });
    if (result.error) throw result.error;
    return true;
  }

  async function getMyDashboard(userId) {
    const db = getClient();
    const [profile, favorites, watchEntries, ratings, achievements, reviews] = await Promise.all([
      db.from("profiles").select("id,username,display_name,avatar_url,bio,is_public,show_posts,show_favorites,show_anime_follows,show_watch_status,show_ratings,show_reviews,show_user_follows,show_ranking").eq("id", userId).maybeSingle(),
      db.from("favorites").select("anime_id,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      db.from("watch_entries").select("anime_id,status,episodes_watched,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(100),
      db.from("ratings").select("anime_id,score,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(50),
      db.from("user_achievements").select("earned_at,achievement:achievements(code,title,description,points,icon_url)").eq("user_id", userId).order("earned_at", { ascending: false }).limit(100),
      db.from("reviews").select("id,anime_id,title,body,spoiler,is_published,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50)
    ]);
    const error = [profile, favorites, watchEntries, ratings, achievements, reviews].find(x => x.error);
    if (error) throw error.error;
    const ids = [
      ...(favorites.data || []).map(x => x.anime_id),
      ...(watchEntries.data || []).map(x => x.anime_id),
      ...(ratings.data || []).map(x => x.anime_id),
      ...(reviews.data || []).map(x => x.anime_id)
    ];
    const uniqueIds = [...new Set(ids)];
    const chunks = [];
    for (let i = 0; i < uniqueIds.length; i += 100) chunks.push(uniqueIds.slice(i, i + 100));
    const works = (await Promise.all(chunks.map(getPublicAnimeByIds))).flat();
    const byId = new Map(works.map(work => [work.id, work]));
    return {
      profile: profile.data || null,
      favorites: (favorites.data || []).map(x => ({ ...byId.get(x.anime_id), saved_at: x.created_at })).filter(x => x.id),
      watchEntries: (watchEntries.data || []).map(x => ({ ...byId.get(x.anime_id), status: x.status, episodes_watched: x.episodes_watched, updated_at: x.updated_at })).filter(x => x.id),
      ratings: (ratings.data || []).map(x => ({ ...byId.get(x.anime_id), score: x.score, updated_at: x.updated_at })).filter(x => x.id),
      reviews: (reviews.data || []).map(x => ({ ...x, anime: byId.get(x.anime_id) })).filter(x => x.anime),
      achievements: (achievements.data || []).filter(x => x.achievement).map(x => ({ ...x.achievement, earned_at: x.earned_at }))
    };
  }

  async function createReview(animeId, userId, values) {
    const title = String(values.title || "").trim().slice(0, 120);
    const body = String(values.body || "").trim().slice(0, 5000);
    if (!title || !body) throw new Error("レビューのタイトルと本文を入力してください。");
    const result = await getClient().from("reviews").insert({
      anime_id: animeId, user_id: userId, title, body,
      spoiler: Boolean(values.spoiler), is_published: false
    }).select("id").single();
    if (result.error) throw result.error;
    return result.data;
  }

  async function listPendingReviews() {
    const result = await getClient().from("reviews")
      .select("id,anime_id,user_id,title,body,spoiler,created_at")
      .eq("is_published", false)
      .order("created_at", { ascending: true })
      .limit(100);
    if (result.error) throw result.error;
    const rows = result.data || [];
    const works = await getPublicAnimeByIds(rows.map(row => row.anime_id));
    const byId = new Map(works.map(work => [work.id, work]));
    return rows.map(row => ({ ...row, anime: byId.get(row.anime_id) })).filter(row => row.anime);
  }

  async function moderateReview(reviewId, publish = true) {
    const result = await getClient().from("reviews")
      .update({ is_published: Boolean(publish) })
      .eq("id", reviewId)
      .select("id,is_published")
      .single();
    if (result.error) throw result.error;
    return result.data;
  }

  async function updateProfile(userId, values) {
    const allowed = {
      username: String(values.username || "").trim().slice(0, 30) || null,
      display_name: String(values.display_name || "").trim().slice(0, 50) || null,
      bio: String(values.bio || "").trim().slice(0, 300) || null,
      is_public: values.is_public !== false,
      show_posts: values.show_posts !== false,
      show_favorites: values.show_favorites !== false,
      show_anime_follows: values.show_anime_follows !== false,
      show_watch_status: values.show_watch_status !== false,
      show_ratings: values.show_ratings !== false,
      show_reviews: values.show_reviews !== false,
      show_user_follows: values.show_user_follows !== false,
      show_ranking: values.show_ranking !== false
    };
    const result = await getClient().from("profiles").update(allowed).eq("id", userId)
      .select("id,username,display_name,bio,is_public,show_posts,show_favorites,show_anime_follows,show_watch_status,show_ratings,show_reviews,show_user_follows,show_ranking").single();
    if (result.error) throw result.error;
    return result.data;
  }

  async function listQuizzes() {
    const result = await getClient().from("quizzes").select("id,title,description,category,difficulty,created_at").eq("is_published", true).order("difficulty", { ascending: true });
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function getQuiz(quizId) {
    const db = getClient();
    const quiz = await db.from("quizzes").select("id,title,description,category,difficulty").eq("id", quizId).eq("is_published", true).maybeSingle();
    if (quiz.error) throw quiz.error;
    if (!quiz.data) return null;
    const questions = await db.from("quiz_questions").select("id,question_text,explanation,question_order,points").eq("quiz_id", quizId).order("question_order", { ascending: true });
    if (questions.error) throw questions.error;
    const ids = (questions.data || []).map(q => q.id);
    if (!ids.length) return { ...quiz.data, questions: [] };
    const choices = await db.from("quiz_choices").select("id,question_id,choice_text,choice_order").in("question_id", ids).order("choice_order", { ascending: true });
    if (choices.error) throw choices.error;
    return {
      ...quiz.data,
      questions: (questions.data || []).map(q => ({
        ...q,
        choices: (choices.data || []).filter(choice => choice.question_id === q.id)
      }))
    };
  }

  async function submitQuiz(quizId, answers) {
    const result = await getClient().functions.invoke("submit-quiz-attempt", {
      body: { quizId, answers }
    });
    if (result.error) throw result.error;
    return result.data?.result || null;
  }

  async function isAdmin() {
    const result = await getClient().rpc("is_anixia_admin");
    if (result.error) throw result.error;
    return result.data === true;
  }

  async function syncAnnictCatalog(startPage = 1, maxPages = 3, mode = "sync") {
    const result = await getClient().functions.invoke("sync-annict-catalog", {
      body: { startPage, maxPages, mode }
    });
    if (result.error) throw new Error(result.data?.error || result.error.message || "Annict同期に失敗しました。");
    if (result.data?.error) throw new Error(result.data.error);
    return result.data;
  }

  async function syncAnnictWorkDetails(workId, pages = {}) {
    const result = await getClient().functions.invoke("sync-annict-work-details", {
      body: { workId: String(workId || "").trim(), pages }
    });
    if (result.error) throw new Error(result.data?.error || result.error.message || "作品詳細の同期に失敗しました。");
    if (result.data?.error) throw new Error(result.data.error);
    return result.data;
  }

  async function getAdminCatalogQualityReport(limit = 150) {
    const size = Math.min(Math.max(Number(limit) || 150, 1), 200);
    const result = await getClient().rpc("admin_get_catalog_quality_report", { p_limit: size });
    if (result.error) throw result.error;
    return result.data || { summary: {}, items: [] };
  }

  async function getAdminEntityDuplicateCandidates(limit = 100) {
    const size = Math.min(Math.max(Number(limit) || 100, 1), 100);
    const result = await getClient().rpc("admin_get_entity_duplicate_candidates", { p_limit: size });
    if (result.error) throw result.error;
    return result.data || { candidate_count: 0, items: [] };
  }

  async function getAdminAnimeDuplicateCandidates(limit = 100) {
    const size = Math.min(Math.max(Number(limit) || 100, 1), 100);
    const result = await getClient().rpc("admin_get_anime_duplicate_candidates", { p_limit: size });
    if (result.error) throw result.error;
    return result.data || { candidate_count: 0, items: [] };
  }

  async function mergeAdminCatalogEntity(entityType, sourceId, targetId) {
    if (!["people","characters","studios","organizations"].includes(entityType) || !sourceId || !targetId || sourceId === targetId) {
      throw new Error("統合対象を正しく指定してください。");
    }
    const result = await getClient().rpc("admin_merge_catalog_entity", {
      p_entity_type: entityType,
      p_source_id: sourceId,
      p_target_id: targetId
    });
    if (result.error) throw result.error;
    return result.data;
  }

  async function listPendingAnime(limit = 50) {
    const size = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const result = await getClient().from("anime")
      .select("id,title,title_ja,title_kana,format,release_year,season,season_name,season_name_text,official_url,official_site_url,wikipedia_url,source,source_id,source_synced_at,updated_at")
      .eq("is_published", false)
      .order("updated_at", { ascending: false })
      .limit(size);
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function listPendingEpisodes(limit = 100) {
    const size = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const result = await getClient().from("episodes")
      .select("id,anime_id,episode_number,episode_order,episode_kind,title,title_ja,synopsis,aired_at,source,source_id,updated_at,anime:anime!episodes_anime_id_fkey(id,title,title_ja)")
      .eq("is_published", false)
      .order("updated_at", { ascending: false })
      .limit(size);
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function setEpisodePublished(episodeId, publish = true) {
    const result = await getClient().from("episodes")
      .update({ is_published: Boolean(publish) })
      .eq("id", episodeId)
      .select("id,is_published")
      .single();
    if (result.error) throw result.error;
    return result.data;
  }

  async function setAnimePublished(animeId, publish = true) {
    const result = await getClient().from("anime")
      .update({ is_published: Boolean(publish) })
      .eq("id", animeId)
      .select("id,is_published")
      .single();
    if (result.error) throw result.error;
    return result.data;
  }

  async function getAdminAnimeOptions(limit = 500) {
    const size = Math.min(Math.max(Number(limit) || 500, 1), 1000);
    const result = await getClient().from("anime")
      .select("id,title,title_ja,title_kana,format,release_year,season,season_name,season_name_text,is_published,synopsis,official_url,official_site_url,updated_at")
      .order("title", { ascending: true })
      .limit(size);
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function getAdminTaxonomy() {
    const db = getClient();
    const [genres, tags] = await Promise.all([
      db.from("genres").select("id,name,name_ja,description").order("name_ja", { ascending: true }),
      db.from("tags").select("id,name,name_ja,description").order("name_ja", { ascending: true })
    ]);
    if (genres.error || tags.error) throw genres.error || tags.error;
    return { genres: genres.data || [], tags: tags.data || [] };
  }

  async function getAdminAnimeTaxonomy(animeId) {
    const db = getClient();
    const [genres, tags, relations] = await Promise.all([
      db.from("anime_genres").select("genre_id").eq("anime_id", animeId),
      db.from("anime_tags").select("tag_id").eq("anime_id", animeId),
      db.from("anime_relations").select("related_anime_id,relation_type,display_order,notes").eq("anime_id", animeId).order("display_order", { ascending: true })
    ]);
    if (genres.error || tags.error || relations.error) throw genres.error || tags.error || relations.error;
    return {
      genreIds: (genres.data || []).map(row => row.genre_id),
      tagIds: (tags.data || []).map(row => row.tag_id),
      relations: relations.data || []
    };
  }

  async function replaceAdminAnimeTaxonomy(animeId, genreIds, tagIds) {
    const result = await getClient().rpc("admin_replace_anime_taxonomy", {
      p_anime_id: animeId,
      p_genre_ids: [...new Set(genreIds || [])],
      p_tag_ids: [...new Set(tagIds || [])]
    });
    if (result.error) throw result.error;
    return result.data;
  }

  async function createAdminTaxonomyItem(kind, name) {
    const table = kind === "genre" ? "genres" : kind === "tag" ? "tags" : null;
    if (!table) throw new Error("Unknown taxonomy type.");
    const clean = String(name || "").trim().slice(0, 80);
    if (!clean) throw new Error("名称を入力してください。");
    const result = await getClient().from(table)
      .insert({ name: clean, name_ja: clean })
      .select("id,name,name_ja")
      .single();
    if (result.error) throw result.error;
    return result.data;
  }

  async function saveAdminAnimeRelation(animeId, relatedAnimeId, relationType) {
    if (!animeId || !relatedAnimeId || animeId === relatedAnimeId) {
      throw new Error("異なる2作品を選択してください。");
    }
    const result = await getClient().from("anime_relations").upsert({
      anime_id: animeId,
      related_anime_id: relatedAnimeId,
      relation_type: relationType,
      display_order: 1
    }, { onConflict: "anime_id,related_anime_id,relation_type" });
    if (result.error) throw result.error;
    return true;
  }

  async function removeAdminAnimeRelation(animeId, relatedAnimeId, relationType) {
    const result = await getClient().from("anime_relations").delete()
      .eq("anime_id", animeId)
      .eq("related_anime_id", relatedAnimeId)
      .eq("relation_type", relationType);
    if (result.error) throw result.error;
    return true;
  }

  async function diagnoseAnime(options = {}) {
    const result = await getClient().rpc("recommend_public_anime", {
      p_genre_ids: Array.isArray(options.genreIds) ? options.genreIds.slice(0, 3) : [],
      p_format: options.format || null,
      p_year: options.year ? Number(options.year) : null,
      p_season: options.season || null,
      p_limit: 30
    });
    if (result.error) throw result.error;
    const titled = await attachEnglishTitles(result.data || []);
    return attachPosterCredits(titled);
  }
  

  async function getRankings(metric = "popular", limit = 30) {
    const size = Math.min(Math.max(Number(limit) || 30, 1), 50);
    const result = await listAnime({ sort: metric, limit: size });
    return result.data;
  }


  function posterMarkup(url, alt = "", credit = null) {
    const safeUrl = String(url || "").trim();
    const sourceUrl = String(credit?.source_url || "");
    const attribution = String(credit?.attribution || "");
    if (!safeUrl || !sourceUrl.startsWith("https://") || !attribution) return "";
    const safeAlt = String(alt ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const safeSrc = safeUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    return '<img data-anixia-poster src="' + safeSrc + '" alt="' + safeAlt + '" loading="lazy" decoding="async">';
  }

  document.addEventListener("load", event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.hasAttribute("data-anixia-poster")) return;
    image.classList.toggle("anixia-poster-logo", image.naturalWidth > image.naturalHeight * 1.15);
  }, true);

  document.addEventListener("error", event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.hasAttribute("data-anixia-poster")) return;
    image.hidden = true;
    const fallback = image.parentElement?.querySelector(".anixia-poster-fallback");
    if (fallback) fallback.hidden = false;
  }, true);

  async function syncCommonsPosters(options = {}) {
    const result = await getClient().functions.invoke("sync-commons-posters", {
      body: { limit: options.limit || 20, force: options.force === true, animeIds: Array.isArray(options.animeIds) ? options.animeIds.slice(0, 30) : [] }
    });
    if (result.error) throw new Error(result.data?.error || result.error.message || "画像同期に失敗しました。");
    if (result.data?.error) throw new Error(result.data.error);
    return result.data;
  }

  w.ANIXIA = Object.freeze({
    URL, getClient, listAnime, suggestCatalog, getAnime, getGenres, getStudios, getTags, posterMarkup, syncCommonsPosters,
    getCatalogCount, getPublicAnimeByIds, getUser, getUserAnimeState, toggleFavorite,
    saveWatchEntry, saveRating, getMyDashboard, createReview,
    listPendingReviews, moderateReview, updateProfile, listQuizzes, getQuiz, submitQuiz, isAdmin, syncAnnictCatalog, syncAnnictWorkDetails,
    listPendingAnime, getAdminCatalogQualityReport, getAdminEntityDuplicateCandidates, getAdminAnimeDuplicateCandidates, mergeAdminCatalogEntity, setAnimePublished, listPendingEpisodes, setEpisodePublished,
    getAdminAnimeOptions, getAdminTaxonomy,
    getAdminAnimeTaxonomy, replaceAdminAnimeTaxonomy, createAdminTaxonomyItem,
    saveAdminAnimeRelation, removeAdminAnimeRelation, diagnoseAnime, getRankings
  });
})(window);
