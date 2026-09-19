#!/usr/bin/env node
/**
 * Collects every generated SEO/quality report into a single artifact folder
 * (plus a zip when the `zip` CLI is available) so CI can upload one bundle.
 *
 * Output: .lovable/artifacts/
 *   manifest.json              index of all collected files + check statuses
 *   summary.md                 human-readable digest
 *   seo-report.json            aggregated report (all sections)
 *   seo-history.json           regression/fix log
 *   seo-baseline.json          metadata baseline
 *   indexing-state.json        per-URL indexing verdicts
 *   lighthouse.json            raw Lighthouse run
 *   link-check.csv             link table
 *   seo-artifacts.zip          the above, zipped (best effort)
 *
 * Usage: node scripts/collect-artifacts.mjs [--out <dir>]
 */
import { existsSync, mkdirSync, copyFileSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import { readReport } from "./report-store.mjs";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const OUT = outIdx !== -1 ? args[outIdx + 1] : ".lovable/artifacts";

const SOURCES = [
  { file: "src/generated/seo-report.json", as: "seo-report.json", label: "Aggregated report" },
  { file: ".lovable/seo-history.json", as: "seo-history.json", label: "Regression & fix history" },
  { file: ".lovable/seo-baseline.json", as: "seo-baseline.json", label: "Metadata baseline" },
  { file: ".lovable/indexing-state.json", as: "indexing-state.json", label: "Indexing verdicts" },
  { file: ".lovable/indexing-cache.json", as: "indexing-cache.json", label: "Indexing API cache" },
  { file: ".lovable/reports/lighthouse.json", as: "lighthouse.json", label: "Lighthouse raw run" },
  { file: ".lovable/reports/link-check.csv", as: "link-check.csv", label: "Link check table" },
  { file: ".lovable/lighthouse-thresholds.json", as: "lighthouse-thresholds.json", label: "Lighthouse thresholds" },
  { file: ".lovable/alerts-log.json", as: "alerts-log.json", label: "Alert delivery log" },
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const collected = [];
const missing = [];
for (const s of SOURCES) {
  if (existsSync(s.file)) {
    copyFileSync(s.file, join(OUT, s.as));
    collected.push({ name: s.as, label: s.label, source: s.file });
  } else {
    missing.push(s.file);
  }
}

const report = readReport();
const sections = Object.values(report.sections ?? {}).map((s) => ({
  name: s.name,
  label: s.label,
  status: s.status,
  summary: s.summary,
  issues: (s.issues ?? []).length,
  ranAt: s.ranAt,
}));

const manifest = {
  generatedAt: new Date().toISOString(),
  site: "https://ambient-voice-flow.lovable.app",
  commit: process.env.GITHUB_SHA ?? process.env.COMMIT_SHA ?? null,
  overallStatus: sections.some((s) => s.status === "fail")
    ? "fail"
    : sections.some((s) => s.status === "warn")
      ? "warn"
      : "pass",
  checks: sections,
  artifacts: collected,
  missing,
};
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

const md = [
  `# SEO & quality artifacts`,
  ``,
  `Generated ${manifest.generatedAt} — overall **${manifest.overallStatus.toUpperCase()}**`,
  ``,
  `| Check | Status | Issues | Summary |`,
  `| --- | --- | --- | --- |`,
  ...sections.map((s) => `| ${s.label} | ${s.status} | ${s.issues} | ${s.summary} |`),
  ``,
  `## Files`,
  ...collected.map((c) => `- \`${c.name}\` — ${c.label}`),
  missing.length ? `\n## Not produced in this run\n${missing.map((m) => `- \`${m}\``).join("\n")}` : "",
].join("\n");
writeFileSync(join(OUT, "summary.md"), md + "\n");

// Best-effort zip so a CI "upload artifact" step can grab one file.
const zipName = "seo-artifacts.zip";
const zip = spawnSync("zip", ["-q", "-r", zipName, ".", "-x", zipName], { cwd: OUT, encoding: "utf8" });
const zipped = !zip.error && zip.status === 0 && existsSync(join(OUT, zipName));

console.log(`\nArtifacts collected in ${OUT} (overall ${manifest.overallStatus}):`);
for (const f of readdirSync(OUT)) console.log(`  • ${basename(f)}`);
if (!zipped) console.log("  (zip CLI unavailable — upload the folder contents directly)");
if (missing.length) console.log(`  missing: ${missing.join(", ")}`);
