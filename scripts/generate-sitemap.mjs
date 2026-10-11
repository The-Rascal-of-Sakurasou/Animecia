import { writeFile, readdir, unlink } from "node:fs/promises";

const base = "https://media-mania.github.io/Animecia";
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function fetchAnimePage(offset) {
  const url = new URL("/rest/v1/animecia_public_anime", supabaseUrl);
  url.searchParams.set("select", "id,updated_at");
  url.searchParams.set("order", "id.asc");
  url.searchParams.set("limit", "1000");
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

async function fetchGenrePage(ids, offset) {
  const url = new URL("/rest/v1/anime_genres", supabaseUrl);
  url.searchParams.set("select", "anime_id,genre_id");
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

async function fetchPublicGenreIds(animeIds) {
  const genreIds = new Set();
  for (let start = 0; start < animeIds.length; start += 100) {
    const ids = animeIds.slice(start, start + 100);
    let offset = 0;
    while (true) {
      const rows = await fetchGenrePage(ids, offset);
      for (const row of rows) {
        const id = Number(row.genre_id);
        if (Number.isInteger(id)) genreIds.add(id);
      }
      if (rows.length < 1000) break;
      offset += rows.length;
    }
  }
  return [...genreIds];
}


function urlEntry(loc, lastmod) {
  return [
    "  <url>",
    `    <loc>${esc(loc)}</loc>`,
    lastmod ? `    <lastmod>${esc(new Date(lastmod).toISOString())}</lastmod>` : "",
    "  </url>",
  ].filter(Boolean).join("\n");
}

const fixedPages = [
  `${base}/`,
  `${base}/anime.html`,
  `${base}/ranking.html`,
  `${base}/compare.html`,
  `${base}/season.html`,
  `${base}/genres.html`,
  `${base}/discover.html`,
];

const animeRows = [];
for (let offset = 0; ; offset += 1000) {
  const rows = await fetchAnimePage(offset);
  animeRows.push(...rows);
  if (rows.length < 1000) break;
}

const genreIds = await fetchPublicGenreIds(animeRows.map(row => Number(row.id)));

const pageXml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...fixedPages.map(loc => urlEntry(loc)),
  ...genreIds.map(id => urlEntry(`${base}/genre/${encodeURIComponent(id)}/`)),
  "</urlset>",
].join("\n");

await writeFile("sitemap-pages.xml", pageXml, "utf8");

const chunkSize = 5000;
const sitemapFiles = [];
for (let i = 0, chunkIndex = 1; i < animeRows.length; i += chunkSize, chunkIndex++) {
  const chunk = animeRows.slice(i, i + chunkSize);
  const filename = `sitemap-anime-${chunkIndex}.xml`;
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...chunk.map(row => urlEntry(`${base}/anime/${encodeURIComponent(row.id)}/`, row.updated_at)),
    "</urlset>",
  ].join("\n");
  await writeFile(filename, xml, "utf8");
  sitemapFiles.push(filename);
}

const existing = await readdir(".");
for (const filename of existing) {
  if (/^sitemap-anime-\d+\.xml$/.test(filename) && !sitemapFiles.includes(filename)) {
    await unlink(filename);
  }
}

const indexXml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  '  <sitemap><loc>' + base + '/sitemap-pages.xml</loc></sitemap>',
  ...sitemapFiles.map(filename => `  <sitemap><loc>${base}/${filename}</loc></sitemap>`),
  "</sitemapindex>",
].join("\n");
await writeFile("sitemap.xml", indexXml, "utf8");

console.log(`Generated sitemap for ${animeRows.length} anime records across ${sitemapFiles.length} anime sitemap files.`);
