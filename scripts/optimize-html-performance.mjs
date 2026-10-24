import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const SUPABASE_ORIGIN = "https://bhgdjuwlxvbaeraaivmh.supabase.co";
const CDN_ORIGIN = "https://cdn.jsdelivr.net";
const SDK_URL = CDN_ORIGIN + "/npm/@supabase/supabase-js@2";

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

function addHeadLink(html, href, tag) {
  if (html.includes('href="' + href + '"')) return html;
  return html.replace(/<\/head>/i, tag + "\n</head>");
}

function hasImmediateClientInit(html) {
  const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  return blocks.some(match => {
    if (/\bsrc\s*=/.test(match[1])) return false;
    const body = match[2];
    return /(?:const|let|var)\s+supabaseClient\s*=\s*AnimeciaAuth\.client\(\)/.test(body) ||
      /(?:const|let|var)\s+sb\s*=\s*AnimeciaAuth\.client\(\)/.test(body) ||
      /\bK\s*=\s*[^,;]+,\s*sb\s*=\s*AnimeciaAuth\.client\(\)/.test(body) ||
      /(?:window\.)?supabase\.createClient\s*\(/.test(body);
  });
}

function prepareSupabaseSdk(html) {
  if (!html.includes(SDK_URL)) return html;
  html = addHeadLink(html, SUPABASE_ORIGIN,
    '<link rel="preconnect" href="' + SUPABASE_ORIGIN + '" crossorigin>');
  html = addHeadLink(html, CDN_ORIGIN,
    '<link rel="preconnect" href="' + CDN_ORIGIN + '" crossorigin>');
  html = addHeadLink(html, SDK_URL,
    '<link rel="preload" as="script" href="' + SDK_URL + '">');

  if (hasImmediateClientInit(html)) {
    html = html.replace(/<script\b(?=[^>]*\bsrc=["']https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2["'])[^>]*>\s*<\/script>/gi, "");
    const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
    const target = blocks.find(match => !/\bsrc\s*=/.test(match[1]) && /(?:AnimeciaAuth\.client\(\)|(?:window\.)?supabase\.createClient\s*\()/.test(match[2]));
    if (target) html = html.slice(0, target.index) +
      '<script src="' + SDK_URL + '"></script>\n' + html.slice(target.index);
  } else {
    html = html.replace(/<script\s+src="([^"]*supabase-js@2)"\s*><\/script>/g,
      '<script src="$1" defer></script>');
  }
  return html;
}

function optimize(html, file) {
  const relativePath = relative(root, file).replaceAll("\\", "/");
  const depth = relativePath.split("/").length - 1;
  const performanceScript = depth === 0 ? "performance.js" : "../".repeat(depth) + "performance.js";

  if (!html.includes('src="' + performanceScript + '"') &&
      !html.includes("src='" + performanceScript + "'")) {
    html = html.replace(/<\/head>/i,
      '<script src="' + performanceScript + '" defer></script>\n</head>');
  }

  html = prepareSupabaseSdk(html);

  const firstImage = html.match(/<img\b[^>]*?src=["'](https?:\/\/[^"'#?]+)[^"']*["']/i);
  const socialImage = html.match(/<meta\s+property=["']og:image["']\s+content=["'](https?:\/\/[^"'#?]+)[^"']*["']/i);
  const imageUrl = firstImage?.[1] || socialImage?.[1];
  if (imageUrl) {
    try {
      const origin = new URL(imageUrl).origin;
      if (origin !== "https://media-mania.github.io") {
        html = addHeadLink(html, origin, '<link rel="preconnect" href="' + origin + '" crossorigin>');
      }
    } catch {
      // Ignore malformed image URLs rather than breaking the build.
    }
  }

  let imageCount = 0;
  html = html.replace(/<img\b([^>]*?)>/gi, (match, originalAttributes) => {
    imageCount++;
    let attributes = originalAttributes;
    if (!/\bdecoding\s*=/.test(attributes)) attributes += ' decoding="async"';
    if (!/\bloading\s*=/.test(attributes)) attributes += imageCount === 1 ? ' loading="eager"' : ' loading="lazy"';
    const lazy = /\bloading\s*=\s*["']lazy["']/i.test(attributes);
    if (lazy) {
      attributes = attributes.replace(/\sfetchpriority\s*=\s*["']high["']/i, "");
    } else if (imageCount === 1 && !/\bfetchpriority\s*=/.test(attributes)) {
      attributes += ' fetchpriority="high"';
    }
    return "<img" + attributes + ">";
  });

  html = html.replace(/<iframe\b([^>]*?)>/gi, (match, attributes) =>
    /\bloading\s*=/.test(attributes) ? match : "<iframe" + attributes + ' loading="lazy">'
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
  console.log("Optimized " + changed + " HTML files (scanned " + files.length + ").");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
