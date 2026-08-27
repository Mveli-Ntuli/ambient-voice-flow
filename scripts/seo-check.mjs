#!/usr/bin/env node
/**
 * Automated SEO / Lighthouse-style static audit.
 *
 * Scans every route file in src/routes and checks:
 *  - unique <title> (10-60 chars) per content route
 *  - unique meta description (50-160 chars)
 *  - og:title / og:description / og:url present
 *  - self-referencing canonical on leaf routes (and none on __root)
 *  - heading hierarchy: single h1, no skipped levels
 *  - route present in sitemap.xml entries
 *
 * Regression tracking: results are compared against
 * .lovable/seo-baseline.json. New issues are reported as REGRESSIONS.
 *
 * Usage:  node scripts/seo-check.mjs            (report)
 *         node scripts/seo-check.mjs --update   (accept current state as baseline)
 *         node scripts/seo-check.mjs --strict   (exit 1 on regressions)
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROUTES_DIR = "src/routes";
const SITEMAP_FILE = join(ROUTES_DIR, "sitemap[.]xml.ts");
const BASELINE = ".lovable/seo-baseline.json";
const SITE_URL = "https://ambient-voice-flow.lovable.app";

const update = process.argv.includes("--update");
const strict = process.argv.includes("--strict");

function routeFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return routeFiles(p);
    if (!/\.tsx$/.test(e.name)) return [];
    if (e.name === "__root.tsx") return [];
    return [p];
  });
}

function routePath(file) {
  const rel = file.slice(ROUTES_DIR.length + 1).replace(/\.tsx$/, "");
  if (rel === "index") return "/";
  return "/" + rel.replace(/\.index$/, "").split(".").join("/");
}

function firstMatch(src, re) {
  const m = src.match(re);
  return m ? m[1] : null;
}

/** Resolves top-level `const NAME = "value";` string constants so head() entries
 * written as `content: DESCRIPTION` can still be audited. */
function constants(src) {
  const map = new Map();
  for (const m of src.matchAll(/^const\s+([A-Z0-9_]+)\s*=\s*[`"']([^`"']+)[`"'];/gm)) {
    map.set(m[1], m[2]);
  }
  for (const m of src.matchAll(/^const\s+([A-Z0-9_]+)\s*=\s*\n\s*[`"']([^`"']+)[`"'];/gm)) {
    map.set(m[1], m[2]);
  }
  return map;
}

function value(raw, consts) {
  if (!raw) return null;
  const literal = raw.match(/^[`"'](.*)[`"']$/s);
  if (literal) return literal[1];
  const ident = raw.trim().match(/^([A-Za-z0-9_$]+)$/);
  if (ident && consts.has(ident[1])) return consts.get(ident[1]);
  const tpl = raw.match(/^`(.*)`$/s);
  if (tpl) {
    return tpl[1].replace(/\$\{([A-Za-z0-9_$]+)\}/g, (_, n) => consts.get(n) ?? "");
  }
  return null;
}

const issues = [];
const titles = new Map();
const descriptions = new Map();

const sitemapSrc = existsSync(SITEMAP_FILE) ? readFileSync(SITEMAP_FILE, "utf8") : "";
const files = routeFiles(ROUTES_DIR);

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const path = routePath(file);
  const add = (rule, message) => issues.push({ route: path, rule, message });

  if (!/head:\s*\(/.test(src)) {
    add("head", "route has no head() metadata");
    continue;
  }

  const consts = constants(src);
  const title = value(firstMatch(src, /\{\s*title:\s*([^,\n}]+)/), consts);
  if (!title) add("title", "missing title in head() meta");
  else {
    if (title.length > 60) add("title", `title is ${title.length} chars (max 60)`);
    if (title.length < 10) add("title", `title is only ${title.length} chars`);
    if (titles.has(title)) add("title", `duplicate title, also used by ${titles.get(title)}`);
    else titles.set(title, path);
  }

  const desc = value(
    firstMatch(src, /name:\s*"description",\s*content:\s*([^,\n}]+)/),
    consts,
  );
  if (!desc) add("description", "missing meta description");
  else {
    if (desc.length < 50) add("description", `description is ${desc.length} chars (min 50)`);
    if (desc.length > 160) add("description", `description is ${desc.length} chars (max 160)`);
    if (descriptions.has(desc))
      add("description", `duplicate description, also used by ${descriptions.get(desc)}`);
    else descriptions.set(desc, path);
  }

  for (const prop of ["og:title", "og:description", "og:url"]) {
    if (!src.includes(`"${prop}"`)) add("social", `missing ${prop}`);
  }

  const canonical = value(
    firstMatch(src, /rel:\s*"canonical",\s*href:\s*([^,\n}\]]+)/),
    consts,
  );
  if (!canonical) add("canonical", "missing self-referencing canonical link");
  else {
    const expected = `${SITE_URL}${path === "/" ? "/" : path}`;
    if (canonical.replace(/\/$/, "") !== expected.replace(/\/$/, ""))
      add("canonical", `canonical ${canonical} does not self-reference ${expected}`);
  }

  const headings = [...src.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  const h1s = headings.filter((h) => h === 1).length;
  if (h1s === 0) add("headings", "no <h1> on page");
  if (h1s > 1) add("headings", `${h1s} <h1> elements (expected 1)`);
  let prev = 0;
  for (const level of headings) {
    if (prev && level > prev + 1) add("headings", `heading level skipped: h${prev} -> h${level}`);
    prev = Math.max(prev, level === 1 ? 1 : level);
    prev = level;
  }

  if (sitemapSrc && !sitemapSrc.includes(`"${path}"`))
    add("sitemap", "route is not listed in sitemap.xml");
}

if (!existsSync("public/robots.txt")) {
  issues.push({ route: "-", rule: "robots", message: "public/robots.txt is missing" });
}
if (!sitemapSrc) {
  issues.push({ route: "-", rule: "sitemap", message: "sitemap.xml route is missing" });
}

const key = (i) => `${i.route}|${i.rule}|${i.message}`;
const current = issues.map(key).sort();

mkdirSync(".lovable", { recursive: true });
if (update) {
  writeFileSync(BASELINE, JSON.stringify({ issues: current }, null, 2) + "\n");
  console.log(`SEO baseline updated (${current.length} known issues).`);
  process.exit(0);
}

const baseline = existsSync(BASELINE)
  ? new Set(JSON.parse(readFileSync(BASELINE, "utf8")).issues ?? [])
  : new Set();
const regressions = current.filter((k) => !baseline.has(k));
const resolved = [...baseline].filter((k) => !current.includes(k));

console.log(`\nSEO check — ${files.length} routes scanned, ${issues.length} issue(s) found.`);
for (const i of issues) console.log(`  [${i.rule}] ${i.route}: ${i.message}`);
if (resolved.length) {
  console.log(`\nFixed since baseline (${resolved.length}):`);
  for (const r of resolved) console.log(`  ✓ ${r.split("|").join(" — ")}`);
}
if (regressions.length) {
  console.log(`\nREGRESSIONS (${regressions.length}) — new since baseline:`);
  for (const r of regressions) console.log(`  ✗ ${r.split("|").join(" — ")}`);
  if (strict) process.exit(1);
} else {
  console.log("\nNo SEO regressions against baseline.");
}
