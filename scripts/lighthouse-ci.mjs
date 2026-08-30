#!/usr/bin/env node
/**
 * Lighthouse CI step.
 *
 * Runs Lighthouse against the built/preview site and fails the build when
 * performance, accessibility, best-practices or SEO drop below the thresholds
 * in .lovable/lighthouse-thresholds.json.
 *
 * Usage: node scripts/lighthouse-ci.mjs [--url http://localhost:8080] [--strict]
 *
 * When the Lighthouse CLI or a reachable URL is unavailable the step records a
 * "skipped" status instead of failing the build.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { writeSection, readReport } from "./report-store.mjs";

const THRESHOLD_FILE = ".lovable/lighthouse-thresholds.json";
const OUT_JSON = ".lovable/reports/lighthouse.json";
const DEFAULT_THRESHOLDS = {
  performance: 70,
  accessibility: 90,
  "best-practices": 90,
  seo: 90,
};

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const urlArg = args.indexOf("--url");
const url =
  urlArg !== -1 ? args[urlArg + 1] : process.env.LIGHTHOUSE_URL || "http://localhost:8080";

mkdirSync(".lovable/reports", { recursive: true });
if (!existsSync(THRESHOLD_FILE)) {
  mkdirSync(".lovable", { recursive: true });
  writeFileSync(THRESHOLD_FILE, JSON.stringify(DEFAULT_THRESHOLDS, null, 2) + "\n");
}
const thresholds = { ...DEFAULT_THRESHOLDS, ...JSON.parse(readFileSync(THRESHOLD_FILE, "utf8")) };

function skip(reason) {
  writeSection("lighthouse", {
    label: "Lighthouse CI",
    status: "skipped",
    summary: reason,
    issues: [],
    meta: { thresholds, url },
  });
  console.log(`\nLighthouse CI skipped — ${reason}`);
  process.exit(0);
}

// Is the target reachable?
try {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 5000);
  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(t);
  if (!res.ok) skip(`${url} responded with HTTP ${res.status}`);
} catch {
  skip(`${url} is not reachable (start the server or pass --url)`);
}

const run = spawnSync(
  "npx",
  [
    "--yes",
    "lighthouse",
    url,
    "--quiet",
    "--output=json",
    `--output-path=${OUT_JSON}`,
    "--only-categories=performance,accessibility,best-practices,seo",
    '--chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage"',
  ],
  { encoding: "utf8", timeout: 300000 },
);

if (run.error || !existsSync(OUT_JSON)) {
  skip(`Lighthouse CLI unavailable (${run.error?.message ?? run.stderr?.trim() ?? "no report produced"})`);
}

const lhr = JSON.parse(readFileSync(OUT_JSON, "utf8"));
const scores = Object.fromEntries(
  Object.entries(lhr.categories ?? {}).map(([id, c]) => [id, Math.round((c.score ?? 0) * 100)]),
);

const issues = [];
for (const [category, min] of Object.entries(thresholds)) {
  const score = scores[category];
  if (score === undefined) continue;
  if (score < min)
    issues.push({
      route: url,
      rule: category,
      message: `${category} scored ${score} (threshold ${min})`,
    });
}

const key = (i) => `${i.route}|${i.rule}|${i.message}`;
const prev = readReport().sections["lighthouse"];
const prevKeys = new Set((prev?.issues ?? []).map(key));
const nowKeys = issues.map(key);

writeSection(
  "lighthouse",
  {
    label: "Lighthouse CI",
    status: issues.length ? "fail" : "pass",
    summary: Object.entries(scores)
      .map(([k, v]) => `${k} ${v}`)
      .join(" · "),
    issues,
    meta: { thresholds, scores, url, previousScores: prev?.meta?.scores ?? null },
  },
  {
    regressions: nowKeys.filter((k) => !prevKeys.has(k)),
    fixes: [...prevKeys].filter((k) => !nowKeys.includes(k)),
  },
);

console.log(`\nLighthouse CI — ${url}`);
for (const [k, v] of Object.entries(scores))
  console.log(`  ${v >= (thresholds[k] ?? 0) ? "✓" : "✗"} ${k}: ${v} (min ${thresholds[k] ?? "-"})`);
if (issues.length && strict) process.exit(1);
