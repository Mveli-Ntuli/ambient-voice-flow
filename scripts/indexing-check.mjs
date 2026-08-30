#!/usr/bin/env node
/**
 * Automated indexing watchdog.
 *
 * Reads every URL from the sitemap route, asks Google Search Console's URL
 * Inspection API for its indexing verdict, and alerts on any page that is not
 * indexed — flagging pages that are newly missing since the last run.
 *
 * State: .lovable/indexing-state.json  (previous verdict per URL)
 * Report: written into the shared SEO report (visible on /seo-report)
 *
 * Usage: node scripts/indexing-check.mjs [--strict]
 * Requires LOVABLE_API_KEY + GOOGLE_SEARCH_CONSOLE_API_KEY in the environment.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { writeSection } from "./report-store.mjs";

const SITEMAP_FILE = "src/routes/sitemap[.]xml.ts";
const STATE_FILE = ".lovable/indexing-state.json";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE_URL = "https://ambient-voice-flow.lovable.app/";
const strict = process.argv.includes("--strict");

const lovableKey = process.env.LOVABLE_API_KEY;
const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;

function record(status, summary, issues = [], meta = {}, changes = {}) {
  writeSection("indexing", { label: "Sitemap indexing status", status, summary, issues, meta }, changes);
  console.log(`\nIndexing check — ${summary}`);
  for (const i of issues) console.log(`  [${i.rule}] ${i.route}: ${i.message}`);
}

const sitemapSrc = existsSync(SITEMAP_FILE) ? readFileSync(SITEMAP_FILE, "utf8") : "";
const paths = [...sitemapSrc.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);
const urls = paths.map((p) => new URL(p, SITE_URL).toString());

if (!urls.length) {
  record("skipped", "no sitemap URLs found");
  process.exit(0);
}
if (!lovableKey || !gscKey) {
  record("skipped", "Search Console credentials are not available in this environment", [], {
    urls,
  });
  process.exit(0);
}

const headers = {
  Authorization: `Bearer ${lovableKey}`,
  "X-Connection-Api-Key": gscKey,
  "Content-Type": "application/json",
};

async function inspect(inspectionUrl) {
  const res = await fetch(`${GATEWAY}/v1/urlInspection/index:inspect`, {
    method: "POST",
    headers,
    body: JSON.stringify({ inspectionUrl, siteUrl: SITE_URL }),
  });
  if (!res.ok) {
    const body = await res.text();
    return { error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
  }
  const data = await res.json();
  const result = data.inspectionResult?.indexStatusResult ?? {};
  return {
    verdict: result.verdict ?? "UNKNOWN",
    coverageState: result.coverageState ?? "unknown",
    lastCrawlTime: result.lastCrawlTime ?? null,
  };
}

const prevState = existsSync(STATE_FILE)
  ? JSON.parse(readFileSync(STATE_FILE, "utf8")).urls ?? {}
  : {};

const results = {};
const issues = [];
const regressions = [];
const fixes = [];

for (const url of urls) {
  const r = await inspect(url);
  results[url] = r;
  const wasIndexed = prevState[url]?.verdict === "PASS";
  const key = `${url}|indexing`;

  if (r.error) {
    issues.push({ route: url, rule: "api", message: r.error });
    continue;
  }
  if (r.verdict !== "PASS") {
    const isNew = !(url in prevState);
    issues.push({
      route: url,
      rule: isNew ? "new-not-indexed" : "not-indexed",
      message: `${isNew ? "New page is not indexed" : "Not indexed"} — ${r.coverageState}`,
    });
    if (wasIndexed || isNew) regressions.push(key);
  } else if (prevState[url] && prevState[url].verdict !== "PASS") {
    fixes.push(key);
  }
}

mkdirSync(".lovable", { recursive: true });
writeFileSync(
  STATE_FILE,
  JSON.stringify({ checkedAt: new Date().toISOString(), urls: results }, null, 2) + "\n",
);

const notIndexed = issues.filter((i) => i.rule !== "api").length;
const apiErrors = issues.filter((i) => i.rule === "api").length;

record(
  notIndexed ? "fail" : apiErrors ? "warn" : "pass",
  `${urls.length} sitemap URL(s) checked — ${notIndexed} not indexed${apiErrors ? `, ${apiErrors} API error(s)` : ""}`,
  issues,
  { urls: results, siteUrl: SITE_URL },
  { regressions, fixes },
);

if (notIndexed) {
  console.log("\nALERT: pages missing from Google's index —");
  for (const i of issues.filter((x) => x.rule !== "api")) console.log(`  ✗ ${i.route} (${i.message})`);
}
if (notIndexed && strict) process.exit(1);
