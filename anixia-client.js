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
        storageKey: "anixia-auth-session"
      }
    });
    return instance;
  }

  const safeTerm = value => String(value || "").trim().replace(/[%,()]/g, " ").replace(/\s+/g, " ").slice(0, 80);

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
      p_offset: offset
    });
    if (result.error) throw result.error;
    const data = result.data || [];
    return { data, count: Number(data[0]?.total_count || 0) };
  }

  async function getAnime(id) {
    const result = await getClient().rpc("get_public_anime_detail", { p_anime_id: id });
    if (result.error) throw result.error;
    return result.data || null;
  }

  async function getGenres() {
    const result = await getClient().from("genres").select("id,name,name_ja").order("name_ja", { ascending: true });
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function getStudios() {
    const result = await getClient().from("studios").select("id,name,name_ja").order("name_ja", { ascending: true }).limit(500);
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
    return result.data || [];
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
      db.from("profiles").select("id,username,display_name,avatar_url,bio,is_public").eq("id", userId).maybeSingle(),
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
      bio: String(values.bio || "").trim().slice(0, 300) || null
    };
    const result = await getClient().from("profiles").update(allowed).eq("id", userId).select("id,username,display_name,bio").single();
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

  async function syncAnnictCatalog(startPage = 1, maxPages = 3) {
    const result = await getClient().functions.invoke("sync-annict-catalog", {
      body: { startPage, maxPages }
    });
    if (result.error) throw new Error(result.data?.error || result.error.message || "Annict同期に失敗しました。");
    if (result.data?.error) throw new Error(result.data.error);
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

  async function setAnimePublished(animeId, publish = true) {
    const result = await getClient().from("anime")
      .update({ is_published: Boolean(publish) })
      .eq("id", animeId)
      .select("id,is_published")
      .single();
    if (result.error) throw result.error;
    return result.data;
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
    return result.data || [];
  }
  

  async function getRankings(metric = "popular", limit = 30) {
    const size = Math.min(Math.max(Number(limit) || 30, 1), 50);
    const result = await listAnime({ sort: metric, limit: size });
    return result.data;
  }


  w.ANIXIA = Object.freeze({
    URL, getClient, listAnime, getAnime, getGenres, getStudios,
    getCatalogCount, getPublicAnimeByIds, getUser, getUserAnimeState, toggleFavorite,
    saveWatchEntry, saveRating, getMyDashboard, createReview,
    listPendingReviews, moderateReview, updateProfile, listQuizzes, getQuiz, submitQuiz, isAdmin, syncAnnictCatalog,
    listPendingAnime, setAnimePublished, diagnoseAnime, getRankings
  });
})(window);
