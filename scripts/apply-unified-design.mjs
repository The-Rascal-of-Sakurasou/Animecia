import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, sep } from "node:path";

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const path = dir === "." ? entry.name : dir + "/" + entry.name;
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}
const allHtml = await walk(".");
let patched = 0, skipped = 0;
for (const file of allHtml) {
  if (file === "googlec7373bcce91aea2b.html") { skipped++; continue; }
  let html = await readFile(file, "utf8");
  if (html.includes("anixia-unified-theme.css")) { skipped++; continue; }
  const isRoot = !file.includes("/");
  const prefix = isRoot ? "/anixia/" : relative(dirname(file), ".").split(sep).join("/") + "/";
  const tags = '\n<link rel="stylesheet" href="' + prefix + 'anixia-unified-theme.css?v=20261120-1">\n<script src="' + prefix + 'anixia-global-header.js?v=20261120-1" defer></script>\n';
  const closeHead = html.toLowerCase().lastIndexOf("</head>");
  if (closeHead < 0) { skipped++; continue; }
  html = html.slice(0, closeHead) + tags + "</head>" + html.slice(closeHead + 7);
  await writeFile(file, html, "utf8");
  patched++;
}
const homePath = "anixia-home.js";
let home = await readFile(homePath, "utf8");
home = home.replace('      loadSection("new-works", { sort: "newest", limit: 5 })\n', "");
await writeFile(homePath, home, "utf8");
const indexPath = "index.html";
let index = await readFile(indexPath, "utf8");
index = index.replace('recent_label:"RECENTLY ADDED",recent_title:"最近追加された作品",recent_sub:"データベースに追加・更新された作品",view_database:"作品一覧 →",', "");
index = index.replace('recent_label:"RECENTLY ADDED",recent_title:"Recently added",recent_sub:"New and updated database entries",view_database:"Browse all titles →", "");
await writeFile(indexPath, index, "utf8");
// Apply the same shell to generated anime and genre detail pages.
console.log(`Unified design references added to ${patched} HTML pages; ${skipped} already covered or intentionally skipped.`);
