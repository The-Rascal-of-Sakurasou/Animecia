import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const SUPABASE_ORIGIN = "https://bhgdjuwlxvbaeraaivmh.supabase.co";
const CDN_ORIGIN = "https://cdn.jsdelivr.net";

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(path);
  }
  return out;
}

function addHeadLinks(html, links) {
  for (const link of links) {
    const marker = `href="${link.href}"`;
    if (!html.includes(marker)) {
      html = html.replace(/<\\/head>/i, `${link.tag}\\n</head>`);
    }
  }
  return html;
}

function optimize(html, file) {
  const relativePath = relative(root, file).replaceAll("\\\\", "/");
  const depth = relativePath.split("/").length - 1;
  const performanceScript = depth === 0
    ? "performance.js"
    : "../".repeat(depth) + "performance.js";

  if (!html.includes(`src="${performanceScript}"`) &&
      !html.includes(`src='${performanceScript}'`)) {
    html = html.replace(/<\\/head>/i, `<script src="${performanceScript}" defer></script>\\n</head>`);
  }

  const usesSupabaseCDN = html.includes("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
  if (usesSupabaseCDN) {
    html = addHeadLinks(html, [
      { href: SUPABASE_ORIGIN, tag: `<link rel="preconnect" href="${SUPABASE_ORIGIN}">` },
      { href: CDN_ORIGIN, tag: `<link rel="preconnect" href="${CDN_ORIGIN}" crossorigin>` },
    ]);
    html = html.replace(/<link\\s+rel="preload"\\s+as="script"\\s+href="[^"]*supabase-js@2"[^>]*>\\s*/g, "");
    html = html.replace(/<script\\s+src="([^"]*supabase-js@2)"\\s*><\\/script>/g, '<script src="$1" defer></script>');
  }

  // Preconnect only to the origin serving the first page image; avoid opening
  // connections to every image host found in a long catalogue page.
  const firstImage = html.match(/<img\\b[^>]*?src=["'](https?:\\/\\/[^"'#?]+)[^"']*["']/i);
  const socialImage = html.match(/<meta\\s+property=["']og:image["']\\s+content=["'](https?:\\/\\/[^"'#?]+)[^"']*["']/i);
  const imageUrl = firstImage?.[1] || socialImage?.[1];
  if (imageUrl) {
    try {
      const origin = new URL(imageUrl).origin;
      if (origin !== "https://media-mania.github.io" &&
          !html.includes(`rel="preconnect" href="${origin}"`)) {
        html = html.replace(/<\\/head>/i, `<link rel="preconnect" href="${origin}" crossorigin>\\n</head>`);
      }
    } catch {
      // Ignore malformed image URLs rather than breaking the build.
    }
  }

  let imageCount = 0;
  html = html.replace(/<img\\b([^>]*?)>/gi, (match, attributes) => {
    imageCount++;
    if (!/\\bdecoding\\s*=/.test(attributes)) attributes += ' decoding="async"';
    if (!/\\bloading\\s*=/.test(attributes)) {
      attributes += imageCount === 1 ? ' loading="eager"' : ' loading="lazy"';
    }
    if (imageCount === 1 && !/\\bfetchpriority\\s*=/.test(attributes)) {
      attributes += ' fetchpriority="high"';
    }
    return "<img" + attributes + ">";
  });

  html = html.replace(/<iframe\\b([^>]*?)>/gi, (match, attributes) =>
    /\\bloading\\s*=/.test(attributes) ? match : "<iframe" + attributes + ' loading="lazy">'
  );

  return html;
}

async function main() {
  let changed = 0;
  const files = await walk(root);
  for (const file of files) {
    const before = await readFile(file, "utf8");
    const after = optimize(before, file);
    if (after !== before) {
      await writeFile(file, after, "utf8");
      changed++;
    }
  }
  console.log(`Optimized ${changed} HTML files (scanned ${files.length}).`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
