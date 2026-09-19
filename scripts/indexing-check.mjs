#!/usr/bin/env node
/**
 * Automated indexing watchdog with caching, throttle handling and a
 * build-failing grace window.
 *
 * Reads every URL from the sitemap route, asks Google Search Console's URL
 * Inspection API for its indexing verdict, and alerts on any page that is not
 * indexed — failing the build when a newly published page is still missing
 * after the configured wait window.
 *
 * Config:  .lovable/indexing-config.json
 *   { "graceHours": 72, "cacheTtlHours": 12, "requestDelayMs": 400, "maxRetries": 4 }
 * State:   .lovable/indexing-state.json   (verdict + firstSeenAt per URL)
 * Cache:   .lovable/indexing-cache.json   (raw API verdicts with TTL)
 *
 * Usage: node scripts/indexing-check.mjs [--strict] [--fresh]
 * Requires LOVABLE_API_KEY + GOOGLE_SEARCH_CONSOLE_API_KEY in the environment.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { writeSection } from "./report-store.mjs";
import { sendAlert } from "./alerts.mjs";

const SITEMAP_FILE = "src/routes/sitemap[.]xml.ts";
const STATE_FILE = ".lovable/indexing-state.json";
const CACHE_FILE = ".lovable/indexing-cache.json";
const CONFIG_FILE = ".lovable/indexing-config.json";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE_URL = "https://ambient-voice-flow.lovable.app/";

const strict = process.argv.includes("--strict");
const fresh = process.argv.includes("--fresh");

const DEFAULT_CONFIG = {
  graceHours: 72,
  cacheTtlHours: 12,
  requestDelayMs: 400,
  maxRetries: 4,
};

mkdirSync(".lovable", { recursive: true });
if (!existsSync(CONFIG_FILE)) {
  writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
}
const config = (() => {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(CONFIG_FILE, "utf8")) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
})();

const lovableKey = process.env.LOVABLE_API_KEY;
const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;

const readJson = (file, fallback) => {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};

async function record(status, summary, issues = [], meta = {}, changes = {}) {
  writeSection("indexing", { label: "Sitemap indexing status", status, summary, issues, meta }, changes);
  console.log(`\nIndexing check — ${summary}`);
  for (const i of issues) console.log(`  [${i.rule}] ${i.route}: ${i.message}`);
  if (status === "fail" || status === "warn") {
    await sendAlert({
      check: "indexing",
      label: "Sitemap indexing status",
      status,
      summary,
      issues,
      regressions: changes.regressions ?? [],
    });
  }
}

const sitemapSrc = existsSync(SITEMAP_FILE) ? readFileSync(SITEMAP_FILE, "utf8") : "";
const paths = [...sitemapSrc.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);
const urls = paths.map((p) => new URL(p, SITE_URL).toString());

if (!urls.length) {
  await record("skipped", "no sitemap URLs found");
  process.exit(0);
}
if (!lovableKey || !gscKey) {
  await record("skipped", "Search Console credentials are not available in this environment", [], { urls });
  process.exit(0);
}

const headers = {
  Authorization: `Bearer ${lovableKey}`,
  "X-Connection-Api-Key": gscKey,
  "Content-Type": "application/json",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Raw API call with exponential backoff on 429 / quota / 5xx. */
async function inspectLive(inspectionUrl) {
  let attempt = 0;
  let throttled = 0;
  for (;;) {
    const res = await fetch(`${GATEWAY}/v1/urlInspection/index:inspect`, {
      method: "POST",
      headers,
      body: JSON.stringify({ inspectionUrl, siteUrl: SITE_URL }),
    });

    if (res.ok) {
      const data = await res.json();
      const result = data.inspectionResult?.indexStatusResult ?? {};
      return {
        verdict: result.verdict ?? "UNKNOWN",
        coverageState: result.coverageState ?? "unknown",
        lastCrawlTime: result.lastCrawlTime ?? null,
        throttled,
      };
    }

    const body = await res.text();
    const rateLimited =
      res.status === 429 ||
      res.status >= 500 ||
      (res.status === 403 && /quota|rate|userRateLimit/i.test(body));

    if (rateLimited && attempt < config.maxRetries) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(30000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 400);
      attempt += 1;
      throttled += 1;
      console.log(`  throttled (HTTP ${res.status}) — retry ${attempt}/${config.maxRetries} in ${waitMs}ms`);
      await sleep(waitMs);
      continue;
    }

    return {
      error: `HTTP ${res.status}: ${body.slice(0, 200)}`,
      rateLimited,
      throttled,
    };
  }
}

const cache = fresh ? { entries: {} } : readJson(CACHE_FILE, { entries: {} });
const cacheTtlMs = config.cacheTtlHours * 3600_000;
let cacheHits = 0;
let apiCalls = 0;
let throttleEvents = 0;

async function inspect(url) {
  const hit = cache.entries?.[url];
  if (hit && Date.now() - new Date(hit.checkedAt).getTime() < cacheTtlMs && !hit.error) {
    cacheHits += 1;
    return { ...hit.result, fromCache: true, checkedAt: hit.checkedAt };
  }
  if (apiCalls > 0) await sleep(config.requestDelayMs);
  apiCalls += 1;
  const result = await inspectLive(url);
  throttleEvents += result.throttled ?? 0;
  cache.entries = cache.entries ?? {};
  cache.entries[url] = { checkedAt: new Date().toISOString(), result, error: Boolean(result.error) };
  return { ...result, fromCache: false };
}

const prevState = readJson(STATE_FILE, {}).urls ?? {};
const nowIso = new Date().toISOString();

const results = {};
const issues = [];
const regressions = [];
const fixes = [];
let gateFailures = 0;

for (const url of urls) {
  const r = await inspect(url);
  const prev = prevState[url];
  const firstSeenAt = prev?.firstSeenAt ?? nowIso;
  const ageHours = (Date.now() - new Date(firstSeenAt).getTime()) / 3600_000;
  const key = `${url}|indexing`;

  results[url] = {
    verdict: r.verdict ?? "UNKNOWN",
    coverageState: r.coverageState ?? "unknown",
    lastCrawlTime: r.lastCrawlTime ?? null,
    firstSeenAt,
    checkedAt: r.checkedAt ?? nowIso,
    fromCache: Boolean(r.fromCache),
    error: r.error ?? null,
  };

  if (r.error) {
    issues.push({
      route: url,
      rule: r.rateLimited ? "rate-limit" : "api",
      message: r.error,
    });
    continue;
  }

  if (r.verdict !== "PASS") {
    const isNew = !prev;
    const pastGrace = ageHours >= config.graceHours;
    const waited = `${Math.floor(ageHours)}h of ${config.graceHours}h wait window`;
    issues.push({
      route: url,
      rule: pastGrace ? "not-indexed-past-window" : isNew ? "new-not-indexed" : "not-indexed",
      message: pastGrace
        ? `Still not indexed after ${waited} — ${r.coverageState}`
        : `${isNew ? "Newly published page is not indexed yet" : "Not indexed"} (${waited}) — ${r.coverageState}`,
    });
    if (pastGrace) gateFailures += 1;
    if (prev?.verdict === "PASS" || isNew) regressions.push(key);
  } else if (prev && prev.verdict !== "PASS") {
    fixes.push(key);
  }
}

writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + "\n");
writeFileSync(
  STATE_FILE,
  JSON.stringify({ checkedAt: nowIso, config, urls: results }, null, 2) + "\n",
);

const notIndexed = issues.filter((i) => i.rule.startsWith("not-indexed") || i.rule === "new-not-indexed").length;
const apiErrors = issues.filter((i) => i.rule === "api" || i.rule === "rate-limit").length;

await record(
  gateFailures ? "fail" : notIndexed || apiErrors ? "warn" : "pass",
  `${urls.length} sitemap URL(s) checked — ${notIndexed} not indexed (${gateFailures} past the ${config.graceHours}h window)` +
    `, ${cacheHits} from cache, ${apiCalls} API call(s)${throttleEvents ? `, ${throttleEvents} throttle retry(ies)` : ""}` +
    `${apiErrors ? `, ${apiErrors} API error(s)` : ""}`,
  issues,
  { urls: results, siteUrl: SITE_URL, config, cacheHits, apiCalls, throttleEvents, gateFailures },
  { regressions, fixes },
);

if (notIndexed) {
  console.log("\nALERT: pages missing from Google's index —");
  for (const i of issues.filter((x) => x.rule !== "api" && x.rule !== "rate-limit"))
    console.log(`  ✗ ${i.route} (${i.message})`);
}
if (gateFailures) {
  console.log(
    `\nGATE: ${gateFailures} page(s) exceeded the ${config.graceHours}h indexing wait window — build fails in strict mode.`,
  );
  if (strict) process.exit(1);
}
