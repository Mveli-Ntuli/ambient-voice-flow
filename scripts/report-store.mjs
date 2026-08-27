/**
 * Shared store for all SEO/quality checks.
 *
 * - src/generated/seo-report.json  → bundled into the app so /seo-report can render it
 * - .lovable/seo-history.json      → append-only log of regressions and fixes
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const REPORT = "src/generated/seo-report.json";
const HISTORY = ".lovable/seo-history.json";
const MAX_HISTORY = 200;

function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

export function readReport() {
  return readJson(REPORT, { sections: {}, history: [] });
}

export function readHistory() {
  return readJson(HISTORY, { events: [] }).events ?? [];
}

/**
 * Records one check's outcome.
 *
 * @param {string} name          check id, e.g. "seo-check"
 * @param {object} section       { status, summary, issues: [{ route, rule, message }], meta }
 * @param {object} [changes]     { regressions: string[], fixes: string[] }
 */
export function writeSection(name, section, changes = {}) {
  const report = readReport();
  const now = new Date().toISOString();

  report.sections[name] = { ...section, name, ranAt: now };

  const events = readHistory();
  for (const key of changes.regressions ?? []) {
    events.push({ at: now, check: name, type: "regression", key });
  }
  for (const key of changes.fixes ?? []) {
    events.push({ at: now, check: name, type: "fix", key });
  }
  const trimmed = events.slice(-MAX_HISTORY);
  writeJson(HISTORY, { events: trimmed });

  report.history = trimmed;
  report.generatedAt = now;
  writeJson(REPORT, report);
}
