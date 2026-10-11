import { mkdir, rm, writeFile } from "node:fs/promises";

const base = "https://media-mania.github.io/Animecia";
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
}

const outDir = "anime";
const pageSize = 500;

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function text(value = "") {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function jsonLd(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

async function fetchAnimePage(offset) {
  const url = new URL("/rest/v1/animecia_public_anime", supabaseUrl);
  url.searchParams.set(
    "select",
    "id,title,title_japanese,title_english,title_native,english_title,description,synopsis,cover_image,banner_image,start_date,end_date,episodes,duration,status,format,season,season_year,source,average_score,popularity,favourites_count,updated_at"
  );
  // The public catalog view applies the same eligibility rules as the live site.
  url.searchParams.set("order", "id.asc");
  url.searchParams.set("limit", String(pageSize));
  url.searchParams.set("offset", String(offset));

  const response = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function fetchAnimeGenrePage(ids, offset) {
  const url = new URL("/rest/v1/anime_genres", supabaseUrl);
  url.searchParams.set("select", "anime_id,genre_id,genres(id,name)");
  url.searchParams.set("anime_id", `in.(${ids.join(",")})`);
  url.searchParams.set("order", "anime_id.asc,genre_id.asc");
  url.searchParams.set("limit", "1000");
  url.searchParams.set("offset", String(offset));
  const response = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase genre request failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function attachAnimeGenres(animeRows) {
  const byAnime = new Map(animeRows.map(anime => [Number(anime.id), []]));
  for (let start = 0; start < animeRows.length; start += 100) {
    const ids = animeRows.slice(start, start + 100).map(anime => Number(anime.id));
    let offset = 0;
    while (true) {
      const rows = await fetchAnimeGenrePage(ids, offset);
      for (const row of rows) {
        const animeId = Number(row.anime_id);
        if (!byAnime.has(animeId) || !row.genres?.id || !row.genres?.name) continue;
        byAnime.get(animeId).push({ genres: { id: row.genres.id, name: row.genres.name } });
      }
      if (rows.length < 1000) break;
      offset += rows.length;
    }
  }
  for (const anime of animeRows) anime.anime_genres = byAnime.get(Number(anime.id)) || [];
}


function mainTitle(anime) {
  return text(
    anime.title_japanese ||
    anime.title ||
    anime.title_native ||
    anime.title_english ||
    anime.english_title ||
    `Animecia作品 #${anime.id}`
  );
}

function description(anime) {
  const value = text(anime.description || anime.synopsis);
  if (value) return value.slice(0, 155);
  return `${mainTitle(anime)}のあらすじ、評価、ジャンル、放送情報、キャラクター、スタッフ、配信情報などをAnimeciaで確認できます。`.slice(0, 155);
}

function genres(anime) {
  return (anime.anime_genres || [])
    .map(row => ({ id: row?.genres?.id, name: row?.genres?.name }))
    .filter(row => row.id && row.name)
    .map(row => ({ id: row.id, name: text(row.name) }));
}

function page(anime) {
  const title = mainTitle(anime);
  const desc = description(anime);
  const canonical = `${base}/anime/${encodeURIComponent(anime.id)}/`;
  const detail = `${base}/anime-detail.html?id=${encodeURIComponent(anime.id)}`;
  const image = /^https?:\/\//i.test(String(anime.cover_image || "")) ? anime.cover_image : "";
  const genreList = genres(anime);
  const genreHtml = genreList.length
    ? `<div class="genres">${genreList.map(g => `<a href="${base}/discover.html?genre=${encodeURIComponent(g.id)}">${esc(g.name)}</a>`).join("")}</div>`
    : "";
  const synopsis = text(anime.synopsis || anime.description);
  const meta = [
    ["形式", anime.format],
    ["放送状況", anime.status],
    ["放送年", anime.season_year],
    ["話数", anime.episodes],
    ["平均評価", anime.average_score],
  ].filter(([,v]) => v !== null && v !== undefined && String(v).trim() !== "");

  const schema = {
    "@context": "https://schema.org",
    "@type": anime.format === "MOVIE" ? "Movie" : "TVSeries",
    name: title,
    url: canonical,
    description: desc,
    image: image || undefined,
    genre: genreList.length ? genreList.map(g => g.name) : undefined,
    dateCreated: anime.start_date || undefined,
    dateModified: anime.updated_at || undefined,
    aggregateRating: anime.average_score
      ? {
          "@type": "AggregateRating",
          ratingValue: Number(anime.average_score),
          bestRating: 10,
          worstRating: 0,
        }
      : undefined,
  };

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | 評価・あらすじ・作品情報 | Animecia</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Animecia">
<meta property="og:title" content="${esc(title)} | Animecia">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
${image ? `<meta property="og:image" content="${esc(image)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${jsonLd(schema)}</script>
<link rel="stylesheet" href="../../site-theme.css?v=20261012">
<style>
body{margin:0;background:#f6f6f6;color:#222;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Yu Gothic",Meiryo,sans-serif;line-height:1.7}
main{max-width:900px;margin:0 auto;padding:32px 20px}
.card{background:#fff;border-radius:16px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,.06)}
h1{line-height:1.35;margin-top:0}
.cover{max-width:280px;max-height:390px;object-fit:cover;border-radius:10px}
.genres{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.genres a{padding:5px 10px;border-radius:999px;background:#eee;color:inherit;text-decoration:none}.genres a:hover{background:#ddd}
.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:20px 0}.meta div{padding:10px;background:#f5f5f5;border-radius:8px}
a.button{display:inline-block;padding:11px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px}
small{color:#666}
</style>
</head>
<body>
<main>
<div class="card">
<p><small>Animecia / アニメ作品情報</small></p>
<h1>${esc(title)}</h1>
${image ? `<img class="cover" src="${esc(image)}" alt="${esc(title)}の画像" loading="eager">` : ""}
${genreHtml}
${synopsis ? `<h2>あらすじ・作品紹介</h2><p>${esc(synopsis)}</p>` : ""}
${meta.length ? `<div class="meta">${meta.map(([k,v]) => `<div><strong>${esc(k)}</strong><br>${esc(v)}</div>`).join("")}</div>` : ""}
<p><a class="button" href="${esc(detail)}">Animeciaで詳細を見る</a></p>
<p><small>評価・レビュー・キャラクター・スタッフ・配信情報などの詳細は作品ページで確認できます。</small></p>
</div>
</main>
</body>
</html>`;
}

const genrePage = (genre, works) => {
  const title = text(genre.name) || "アニメ";
  const canonical = base + "/genre/" + encodeURIComponent(genre.id) + "/";
  const workHtml = works.map(work => {
    const workTitle = mainTitle(work);
    const image = /^https?:\/\//i.test(String(work.cover_image || "")) ? work.cover_image : "";
    return "<article class=\"work\">" +
      (image ? "<img src=\"" + esc(image) + "\" alt=\"" + esc(workTitle) + "の画像\" loading=\"lazy\">" : "") +
      "<div><h2><a href=\"" + base + "/anime/" + encodeURIComponent(work.id) + "/\">" + esc(workTitle) + "</a></h2>" +
      "<p>" + esc(text(work.synopsis || work.description).slice(0, 120) || "作品情報を確認できます。") + "</p>" +
      "<small>評価 " + (work.average_score ? esc(Number(work.average_score).toFixed(1)) : "—") + " / 人気度 " + (work.popularity ? esc(work.popularity) : "—") + "</small></div></article>";
  }).join("");
  const schema = { "@context": "https://schema.org", "@type": "CollectionPage", name: title + "アニメ一覧 | Animecia", url: canonical, description: title + "に関連するアニメ作品をAnimeciaで一覧できます。", inLanguage: "ja" };
  return "<!doctype html><html lang=\"ja\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
    "<title>" + esc(title) + "アニメ一覧 | Animecia</title><meta name=\"description\" content=\"" + esc(title + "に関連するアニメ作品をAnimeciaで一覧できます。") + "\"><meta name=\"robots\" content=\"index,follow\"><link rel=\"canonical\" href=\"" + esc(canonical) + "\">" +
    "<meta property=\"og:title\" content=\"" + esc(title) + "アニメ一覧 | Animecia\"><meta property=\"og:url\" content=\"" + esc(canonical) + "\"><script type=\"application/ld+json\">" + jsonLd(schema) + "</script>" +
    "<link rel=\"stylesheet\" href=\"../../site-theme.css?v=20261012\">" +
    "<style>body{margin:0;background:#f6f6f6;color:#222;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",\"Yu Gothic\",Meiryo,sans-serif;line-height:1.7}main{max-width:1000px;margin:0 auto;padding:28px 18px}.card{background:#fff;border-radius:16px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,.06)}.grid{display:grid;gap:14px}.work{display:grid;grid-template-columns:90px 1fr;gap:16px;padding:14px 0;border-bottom:1px solid #eee}.work img{width:90px;height:125px;object-fit:cover;border-radius:8px}.work h2{font-size:1.05rem;margin:0 0 6px}.work a{color:#111}.work p{margin:5px 0;font-size:.92rem;color:#555}</style></head><body><main><div class=\"card\"><p><small>Animecia / ジャンル</small></p>" +
    "<h1>" + esc(title) + "のアニメ一覧</h1><p>" + esc(title) + "に関連する作品を、Animeciaの作品データをもとに一覧表示しています。</p><section class=\"grid\">" + (workHtml || "<p>現在、このジャンルの作品は登録されていません。</p>") + "</section></div></main></body></html>";
};
const animeRows = [];
for (let offset = 0; ; offset += pageSize) {
  const rows = await fetchAnimePage(offset);
  animeRows.push(...rows);
  if (rows.length < pageSize) break;
}
await attachAnimeGenres(animeRows);

await rm(outDir, { recursive: true, force: true });
await rm("genre", { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await mkdir("genre", { recursive: true });

for (const anime of animeRows) {
  if (!anime?.id) continue;
  const dir = `${outDir}/${anime.id}`;
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/index.html`, page(anime), "utf8");
}

const genreMap = new Map();
for (const anime of animeRows) {
  for (const genre of genres(anime)) {
    const key = String(genre.id);
    if (!genreMap.has(key)) genreMap.set(key, { id: genre.id, name: genre.name, works: [] });
    genreMap.get(key).works.push(anime);
  }
}
for (const genre of genreMap.values()) {
  genre.works.sort((a, b) => {
    const bp = Number(b.popularity) || 0; const ap = Number(a.popularity) || 0;
    if (bp !== ap) return bp - ap;
    return (Number(b.average_score) || 0) - (Number(a.average_score) || 0);
  });
  const dir = `genre/${genre.id}`;
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/index.html`, genrePage(genre, genre.works.slice(0, 60)), "utf8");
}

console.log(`Generated ${animeRows.length} static SEO anime pages and ${genreMap.size} genre pages.`);
