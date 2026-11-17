import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const textExtensions = new Set([
  ".html", ".htm", ".js", ".mjs", ".css", ".md", ".xml", ".txt",
  ".yml", ".yaml", ".json", ".sql", ".toml", ".webmanifest"
]);
const ignored = new Set([".git", ".github", "node_modules", ".next", "dist", "coverage", path.join("supabase", "migrations")]);
const replacements = [
  [/https:\/\/media-mania\.github\.io\/ANIXIA\/?/g, "https://the-rascal-of-sakurasou.github.io/anixia/"],
  [/https:\/\/github\.com\/media-mania\/ANIXIA\/?/g, "https://github.com/The-Rascal-of-Sakurasou/anixia"],
  [/ANIXIA/g, "ANIXIA"]
];

let changed = 0;
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }
    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    let original;
    try { original = await fs.readFile(full, "utf8"); } catch { continue; }
    let next = original;
    for (const [pattern, replacement] of replacements) next = next.replace(pattern, replacement);
    if (next !== original) {
      await fs.writeFile(full, next, "utf8");
      changed++;
    }
  }
}
await walk(root);
console.log(`ANIXIA branding normalized in ${changed} files.`);
