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
  const isRoot = !file.includes("/");
  const prefix = isRoot ? "/anixia/" : relative(dirname(file), ".").split(sep).join("/") + "/";
  if (!html.includes("anixia-unified-theme.css")) {
    const tags = '\n<link rel="stylesheet" href="' + prefix + 'anixia-unified-theme.css?v=20261120-1">\n<script src="' + prefix + 'anixia-global-header.js?v=20261120-4" defer></script>\n';
    const closeHead = html.toLowerCase().lastIndexOf("</head>");
    if (closeHead < 0) { skipped++; continue; }
    html = html.slice(0, closeHead) + tags + "</head>" + html.slice(closeHead + 7);
  }
  html = html.replace(/(src=["'][^"']*anixia-global-header\.js)(?:\?[^"']*)?(["'])/g, "$1?v=20261120-4$2");
  if (file === "index.html") {
    html = html.replace(/\s*<a[^>]*id=["']mypage-link["'][^>]*>[\s\S]*?<\/a>/i, "");
  }
  await writeFile(file, html, "utf8");
  patched++;
}

const homePath = "anixia-home.js";
let home = await readFile(homePath, "utf8");
home = home.replace('      loadSection("new-works", { sort: "newest", limit: 5 })\n', "");
await writeFile(homePath, home, "utf8");

const indexPath = "index.html";
let index = await readFile(indexPath, "utf8");
index = index.replace(/recent_label:"[^"]*",recent_title:"[^"]*",recent_sub:"[^"]*",view_database:"[^"]*",/g, "");
await writeFile(indexPath, index, "utf8");

console.log(`Unified design references refreshed on ${patched} HTML pages; ${skipped} intentionally skipped.`);
