#!/usr/bin/env node
/**
 * Build-time broken link and redirect checker.
 *
 * Internal links (`<Link to="...">`, `href="/..."`) are matched against the
 * real route table; external links are probed over HTTP and classified as
 * ok / redirect / broken. Results are written to the shared SEO report and
 * exported to .lovable/reports/link-check.csv.
 *
 * Usage: node scripts/link-check.mjs [--strict] [--no-external]
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { writeSection, readReport } from "./report-store.mjs";

const ROUTES_DIR = "src/routes";
const SRC_DIR = "src";
const CSV_OUT = ".lovable/reports/link-check.csv";
const strict = process.argv.includes("--strict");
const skipExternal = process.argv.includes("--no-external");
const TIMEOUT_MS = 8000;

function walk(dir, test) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name === "generated" ? [] : walk(p, test);
    return test(e.name) ? [p] : [];
  });
}

function knownRoutes() {
  return new Set(
    walk(ROUTES_DIR, (n) => /\.tsx$/.test(n) && n !== "__root.tsx").map((file) => {
      const rel = file.slice(ROUTES_DIR.length + 1).replace(/\.tsx$/, "");
      if (rel === "index") return "/";
      return "/" + rel.replace(/\.index$/, "").split(".").join("/");
    }),
  );
}

const PUBLIC_FILES = new Set(
  walk("public", () => true).map((p) => "/" + p.slice("public/".length)),
);

const routes = knownRoutes();
routes.add("/sitemap.xml");

const files = walk(SRC_DIR, (n) => /\.(tsx|ts)$/.test(n));
/** @type {Map<string, Set<string>>} url -> source files */
const links = new Map();

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const found = [
    ...[...src.matchAll(/\bto=["']([^"'{}]+)["']/g)].map((m) => m[1]),
    ...[...src.matchAll(/\bhref=["']([^"'{}]+)["']/g)].map((m) => m[1]),
    ...[...src.matchAll(/href:\s*["'](https?:\/\/[^"']+)["']/g)].map((m) => m[1]),
  ];
  for (const raw of found) {
    const url = raw.trim();
    if (!url || url.startsWith("#") || url.startsWith("mailto:") || url.startsWith("tel:")) continue;
    if (!links.has(url)) links.set(url, new Set());
    links.get(url).add(file);
  }
}

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "manual", signal: controller.signal });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: "GET", redirect: "manual", signal: controller.signal });
    }
    return { status: res.status, location: res.headers.get("location") ?? "" };
  } catch (error) {
    return { status: 0, error: String(error.name === "AbortError" ? "timeout" : error.message) };
  } finally {
    clearTimeout(timer);
  }
}

const rows = [];
const issues = [];
const externals = [];

for (const [url, sources] of links) {
  const from = [...sources].join(" ");
  if (/^https?:\/\//.test(url)) {
    externals.push({ url, from });
    continue;
  }
  const path = url.split(/[?#]/)[0];
  if (PUBLIC_FILES.has(path)) {
    rows.push({ url, type: "asset", status: "ok", from });
    continue;
  }
  const normalized = path.length > 1 ? path.replace(/\/$/, "") : "/";
  if (routes.has(normalized)) {
    rows.push({ url, type: "internal", status: "ok", from });
  } else {
    rows.push({ url, type: "internal", status: "broken", from, note: "no matching route or public file" });
    issues.push({ route: from.split(" ")[0], rule: "internal", message: `broken internal link "${url}" (no matching route)` });
  }
}

if (!skipExternal) {
  const results = await Promise.all(
    externals.map(async ({ url, from }) => ({ url, from, ...(await probe(url)) })),
  );
  for (const r of results) {
    if (r.status >= 200 && r.status < 300) {
      rows.push({ url: r.url, type: "external", status: "ok", from: r.from });
    } else if (r.status >= 300 && r.status < 400) {
      rows.push({ url: r.url, type: "external", status: "redirect", from: r.from, note: r.location });
      issues.push({ route: r.from.split(" ")[0], rule: "redirect", message: `${r.url} redirects (${r.status}) to ${r.location || "unknown"}` });
    } else {
      rows.push({
        url: r.url,
        type: "external",
        status: "broken",
        from: r.from,
        note: r.error ?? `HTTP ${r.status}`,
      });
      issues.push({ route: r.from.split(" ")[0], rule: "external", message: `${r.url} failed (${r.error ?? `HTTP ${r.status}`})` });
    }
  }
} else {
  for (const { url, from } of externals)
    rows.push({ url, type: "external", status: "skipped", from });
}

const csv = [
  "url,type,status,note,found_in",
  ...rows.map((r) =>
    [r.url, r.type, r.status, r.note ?? "", r.from]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  ),
].join("\n");
mkdirSync(".lovable/reports", { recursive: true });
writeFileSync(CSV_OUT, csv + "\n");

const broken = rows.filter((r) => r.status === "broken").length;
const redirects = rows.filter((r) => r.status === "redirect").length;

const key = (i) => `${i.route}|${i.rule}|${i.message}`;
const prevKeys = new Set((readReport().sections["link-check"]?.issues ?? []).map(key));
const nowKeys = issues.map(key);

writeSection(
  "link-check",
  {
    label: "Broken links & redirects",
    status: broken ? "fail" : redirects ? "warn" : "pass",
    summary: `${rows.length} link(s) checked — ${broken} broken, ${redirects} redirecting`,
    issues,
    meta: { csv: CSV_OUT, rows },
  },
  {
    regressions: nowKeys.filter((k) => !prevKeys.has(k)),
    fixes: [...prevKeys].filter((k) => !nowKeys.includes(k)),
  },
);

console.log(`\nLink check — ${rows.length} link(s), ${broken} broken, ${redirects} redirecting.`);
for (const r of rows.filter((r) => r.status !== "ok" && r.status !== "skipped"))
  console.log(`  [${r.status}] ${r.url} ${r.note ? `— ${r.note}` : ""} (in ${r.from})`);
console.log(`  Report exported to ${CSV_OUT}`);
if (broken && strict) process.exit(1);
