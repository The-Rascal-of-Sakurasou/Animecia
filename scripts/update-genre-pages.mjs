import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
const root = "genre";
const entries = await readdir(root, { withFileTypes: true });
let updated = 0;
for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const path = join(root, entry.name, "index.html");
  let html;
  try { html = await readFile(path, "utf8"); } catch { continue; }
  const before = html;
  html = html.replace(/<small>評価[\s\S]*?<\/small>/g, "<small>作品情報を見る →</small>");
  if (!html.includes("anixia-genre-pages.css")) {
    html = html.replace("</style>", `</style><link rel="stylesheet" href="../../anixia-genre-pages.css?v=20261121-genre1">`);
  }
  if (html !== before) { await writeFile(path, html, "utf8"); updated++; }
}
console.log("Updated " + updated + " generated genre pages.");
