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
    const limit = Math.min(Math.max(Number(options.limit) || 24, 1), 60);
    const offset = Math.max(Number(options.offset) || 0, 0);
    const term = safeTerm(options.query);
    let genreIds = null;

    if (options.genreId) {
      const relation = await db.from("anime_genres").select("anime_id").eq("genre_id", options.genreId);
      if (relation.error) throw relation.error;
      genreIds = (relation.data || []).map(row => row.anime_id);
      if (!genreIds.length) return { data: [], count: 0 };
    }

    function makeQuery(withCount = false) {
      let q = db.from("anime").select(
        "id,title,title_ja,title_kana,synopsis,format,release_year,season,episode_count,poster_url,watchers_count,reviews_count,studio_id",
        withCount ? { count: "exact" } : {}
      ).eq("is_published", true);
      if (options.year) q = q.eq("release_year", Number(options.year));
      if (options.season) q = q.eq("season", options.season);
      if (options.format) q = q.eq("format", options.format);
      if (options.studioId) q = q.eq("studio_id", options.studioId);
      if (genreIds) q = q.in("id", genreIds);
      return q;
    }

    const sort = options.sort || "newest";
    const applySort = q => {
      if (sort === "popular") return q.order("watchers_count", { ascending: false, nullsFirst: false });
      if (sort === "reviews") return q.order("reviews_count", { ascending: false, nullsFirst: false });
      if (sort === "title") return q.order("title_ja", { ascending: true, nullsFirst: false });
      return q.order("release_year", { ascending: false, nullsFirst: false });
    };

    if (term) {
      const pattern = "%" + term + "%";
      const fields = ["title", "title_ja", "title_kana"];
      const results = await Promise.all(fields.map(field =>
        applySort(makeQuery()).ilike(field, pattern).range(offset, offset + limit - 1)
      ));
      const error = results.find(result => result.error);
      if (error) throw error.error;
      const map = new Map();
      results.forEach(result => (result.data || []).forEach(row => map.set(row.id, row)));
      const rows = [...map.values()];
      rows.sort((x, y) => sort === "popular"
        ? (y.watchers_count || 0) - (x.watchers_count || 0)
        : sort === "reviews"
          ? (y.reviews_count || 0) - (x.reviews_count || 0)
          : sort === "title"
            ? String(x.title_ja || x.title || "").localeCompare(String(y.title_ja || y.title || ""), "ja")
            : (y.release_year || 0) - (x.release_year || 0));
      return { data: rows.slice(0, limit), count: rows.length };
    }

    const result = await applySort(makeQuery(true)).range(offset, offset + limit - 1);
    if (result.error) throw result.error;
    return { data: result.data || [], count: result.count || 0 };
  }

  async function getAnime(id) {
    const db = getClient();
    const work = await db.from("anime")
      .select("id,source,source_id,title,title_ja,title_kana,synopsis,format,release_year,season,episode_count,episode_duration_minutes,status,official_url,poster_url,banner_url,studio_id,watchers_count,reviews_count,episodes_count,no_episodes")
      .eq("id", id).eq("is_published", true).maybeSingle();
    if (work.error) throw work.error;
    if (!work.data) return null;
    const [studio, genres, characters, staff, reviews] = await Promise.all([
      work.data.studio_id ? db.from("studios").select("id,name,name_ja,website_url").eq("id", work.data.studio_id).maybeSingle() : Promise.resolve({ data: null }),
      db.from("anime_genres").select("genre:genres(id,name,name_ja)").eq("anime_id", id),
      db.from("anime_characters").select("role,character:characters(id,name,name_ja,image_url,description)").eq("anime_id", id),
      db.from("anime_staff").select("role,person:people(id,name,name_ja,person_type,image_url)").eq("anime_id", id),
      db.from("reviews").select("id,user_id,title,body,spoiler,created_at").eq("anime_id", id).eq("is_published", true).order("created_at", { ascending: false }).limit(10)
    ]);
    return {
      ...work.data,
      studio: studio.data || null,
      genres: (genres.data || []).map(x => x.genre).filter(Boolean),
      characters: (characters.data || []).map(x => ({ ...x.character, role: x.role })).filter(x => x.id),
      staff: (staff.data || []).map(x => ({ ...x.person, role: x.role })).filter(x => x.id),
      reviews: reviews.data || []
    };
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
    const result = await getClient().from("anime").select("id", { count: "exact", head: true }).eq("is_published", true);
    if (result.error) throw result.error;
    return result.count || 0;
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
    const [profile, favorites, watchEntries, ratings, achievements] = await Promise.all([
      db.from("profiles").select("id,username,display_name,avatar_url,bio,is_public").eq("id", userId).maybeSingle(),
      db.from("favorites").select("created_at,anime:anime(id,title,title_ja,poster_url,release_year,format)").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      db.from("watch_entries").select("status,episodes_watched,updated_at,anime:anime(id,title,title_ja,poster_url,release_year,format)").eq("user_id", userId).order("updated_at", { ascending: false }).limit(100),
      db.from("ratings").select("score,updated_at,anime:anime(id,title,title_ja,poster_url,release_year,format)").eq("user_id", userId).order("updated_at", { ascending: false }).limit(50),
      db.from("user_achievements").select("earned_at,achievement:achievements(code,title,description,points,icon_url)").eq("user_id", userId).order("earned_at", { ascending: false }).limit(100)
    ]);
    const error = [profile, favorites, watchEntries, ratings, achievements].find(x => x.error);
    if (error) throw error.error;
    return {
      profile: profile.data || null,
      favorites: (favorites.data || []).filter(x => x.anime).map(x => ({ ...x.anime, saved_at: x.created_at })),
      watchEntries: (watchEntries.data || []).filter(x => x.anime).map(x => ({ ...x.anime, status: x.status, episodes_watched: x.episodes_watched, updated_at: x.updated_at })),
      ratings: (ratings.data || []).filter(x => x.anime).map(x => ({ ...x.anime, score: x.score, updated_at: x.updated_at })),
      achievements: (achievements.data || []).filter(x => x.achievement).map(x => ({ ...x.achievement, earned_at: x.earned_at }))
    };
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

  async function diagnoseAnime(options = {}) {
    const db = getClient();
    const genreIds = Array.isArray(options.genreIds) ? options.genreIds.slice(0, 3) : [];
    let matched = new Map();
    if (genreIds.length) {
      const relation = await db.from("anime_genres").select("anime_id,genre_id").in("genre_id", genreIds).range(0, 999);
      if (relation.error) throw relation.error;
      (relation.data || []).forEach(row => matched.set(row.anime_id, (matched.get(row.anime_id) || 0) + 1));
      if (!matched.size) return [];
    }
    let query = db.from("anime").select("id,title,title_ja,title_kana,format,release_year,season,poster_url,watchers_count,reviews_count").eq("is_published", true);
    if (options.format) query = query.eq("format", options.format);
    if (options.year) query = query.eq("release_year", Number(options.year));
    if (options.season) query = query.eq("season", options.season);
    if (matched.size) query = query.in("id", [...matched.keys()]);
    const result = await query.order("watchers_count", { ascending: false, nullsFirst: false }).limit(60);
    if (result.error) throw result.error;
    return (result.data || []).map(row => ({
      ...row,
      match_count: matched.get(row.id) || 0,
      match_score: (matched.get(row.id) || 0) * 100 + (row.watchers_count || 0) + (row.reviews_count || 0) * 0.5
    })).sort((a, b) => b.match_score - a.match_score);
  }

  w.ANIXIA = Object.freeze({
    URL, getClient, listAnime, getAnime, getGenres, getStudios,
    getCatalogCount, getUser, getUserAnimeState, toggleFavorite,
    saveWatchEntry, saveRating, getMyDashboard, updateProfile,
    listQuizzes, getQuiz, submitQuiz, diagnoseAnime
  });
})(window);
