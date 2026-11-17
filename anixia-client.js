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
    let base = db.from("anime")
      .select("id,title,title_ja,title_kana,synopsis,format,release_year,season,episode_count,poster_url,watchers_count,reviews_count,studio_id", { count: "exact" })
      .eq("is_published", true);

    if (options.year) base = base.eq("release_year", Number(options.year));
    if (options.season) base = base.eq("season", options.season);
    if (options.format) base = base.eq("format", options.format);
    if (options.studioId) base = base.eq("studio_id", options.studioId);
    if (options.genreId) {
      const relation = await db.from("anime_genres").select("anime_id").eq("genre_id", options.genreId);
      if (relation.error) throw relation.error;
      const ids = (relation.data || []).map(row => row.anime_id);
      if (!ids.length) return { data: [], count: 0 };
      base = base.in("id", ids);
    }

    const term = safeTerm(options.query);
    if (term) {
      const pattern = "%" + term + "%";
      const [a, b, c] = await Promise.all([
        base.ilike("title", pattern).range(offset, offset + limit - 1),
        db.from("anime").select("id,title,title_ja,title_kana,synopsis,format,release_year,season,episode_count,poster_url,watchers_count,reviews_count,studio_id")
          .eq("is_published", true).ilike("title_ja", pattern).range(offset, offset + limit - 1),
        db.from("anime").select("id,title,title_ja,title_kana,synopsis,format,release_year,season,episode_count,poster_url,watchers_count,reviews_count,studio_id")
          .eq("is_published", true).ilike("title_kana", pattern).range(offset, offset + limit - 1)
      ]);
      const error = a.error || b.error || c.error;
      if (error) throw error;
      const map = new Map();
      [...(a.data || []), ...(b.data || []), ...(c.data || [])].forEach(row => map.set(row.id, row));
      const rows = [...map.values()];
      const sort = options.sort || "newest";
      rows.sort((x, y) => sort === "popular"
        ? (y.watchers_count || 0) - (x.watchers_count || 0)
        : sort === "reviews"
          ? (y.reviews_count || 0) - (x.reviews_count || 0)
          : (y.release_year || 0) - (x.release_year || 0));
      return { data: rows.slice(0, limit), count: rows.length };
    }

    const sort = options.sort || "newest";
    if (sort === "popular") base = base.order("watchers_count", { ascending: false, nullsFirst: false });
    else if (sort === "reviews") base = base.order("reviews_count", { ascending: false, nullsFirst: false });
    else if (sort === "title") base = base.order("title_ja", { ascending: true, nullsFirst: false });
    else base = base.order("release_year", { ascending: false, nullsFirst: false });
    const result = await base.range(offset, offset + limit - 1);
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

  async function listQuizzes() {
    const result = await getClient().from("quizzes").select("id,title,description,category,difficulty,created_at").eq("is_published", true).order("difficulty", { ascending: true });
    if (result.error) throw result.error;
    return result.data || [];
  }

  w.ANIXIA = Object.freeze({
    URL, getClient, listAnime, getAnime, getGenres, getStudios,
    getCatalogCount, getUser, listQuizzes
  });
})(window);
