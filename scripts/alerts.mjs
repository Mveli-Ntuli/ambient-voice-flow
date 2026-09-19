#!/usr/bin/env node
/**
 * Alert fan-out for SEO/quality checks.
 *
 * Sends a compact failure notification to Slack and/or email whenever a check
 * reports regressions, broken links, threshold drops or unindexed pages.
 *
 * Configuration: .lovable/alerts.json
 *   {
 *     "slackChannel": "#seo-alerts",
 *     "emailRecipients": ["ops@example.com"],
 *     "emailFrom": "SEO Watchdog <alerts@example.com>",
 *     "notifyOn": ["fail", "warn"],
 *     "enabled": true
 *   }
 *
 * Credentials (any missing channel is skipped, never fatal):
 *   Slack   — LOVABLE_API_KEY + SLACK_API_KEY (connector gateway) or SLACK_WEBHOOK_URL
 *   Email   — RESEND_API_KEY (api.resend.com)
 *
 * CLI: node scripts/alerts.mjs            → alert on the whole current report
 *      node scripts/alerts.mjs --dry-run  → print what would be sent
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { readReport } from "./report-store.mjs";

const CONFIG_FILE = ".lovable/alerts.json";
const LOG_FILE = ".lovable/alerts-log.json";
const SLACK_GATEWAY = "https://connector-gateway.lovable.dev/slack/api";
const SITE = "https://ambient-voice-flow.lovable.app";

const DEFAULT_CONFIG = {
  enabled: true,
  slackChannel: "#seo-alerts",
  emailRecipients: [],
  emailFrom: "SEO Watchdog <onboarding@resend.dev>",
  notifyOn: ["fail"],
};

export function loadAlertConfig() {
  if (!existsSync(CONFIG_FILE)) {
    mkdirSync(".lovable", { recursive: true });
    writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
    return { ...DEFAULT_CONFIG };
  }
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(CONFIG_FILE, "utf8")) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function logDelivery(entry) {
  let log = [];
  if (existsSync(LOG_FILE)) {
    try {
      log = JSON.parse(readFileSync(LOG_FILE, "utf8")).deliveries ?? [];
    } catch {
      log = [];
    }
  }
  log.push({ at: new Date().toISOString(), ...entry });
  mkdirSync(".lovable", { recursive: true });
  writeFileSync(LOG_FILE, JSON.stringify({ deliveries: log.slice(-100) }, null, 2) + "\n");
}

async function sendSlack(text, blocksText, config) {
  const { LOVABLE_API_KEY, SLACK_API_KEY, SLACK_WEBHOOK_URL } = process.env;

  if (SLACK_WEBHOOK_URL) {
    const res = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `${text}\n${blocksText}` }),
    });
    return res.ok
      ? { channel: "slack", ok: true, via: "webhook" }
      : { channel: "slack", ok: false, via: "webhook", error: `HTTP ${res.status}: ${await res.text()}` };
  }

  if (!LOVABLE_API_KEY || !SLACK_API_KEY) {
    return { channel: "slack", ok: false, skipped: true, error: "no Slack credentials configured" };
  }

  const res = await fetch(`${SLACK_GATEWAY}/chat.postMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": SLACK_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: config.slackChannel,
      text,
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: `*${text}*` } },
        { type: "section", text: { type: "mrkdwn", text: blocksText.slice(0, 2900) } },
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: `<${SITE}/seo-report|Open the SEO quality report>` }],
        },
      ],
    }),
  });
  const body = await res.text();
  let data = {};
  try {
    data = JSON.parse(body);
  } catch {
    return { channel: "slack", ok: false, error: `non-JSON response (HTTP ${res.status})` };
  }
  return data.ok
    ? { channel: "slack", ok: true, via: "gateway", channelName: config.slackChannel }
    : { channel: "slack", ok: false, via: "gateway", error: data.error ?? `HTTP ${res.status}` };
}

async function sendEmail(subject, bodyText, config) {
  const key = process.env.RESEND_API_KEY;
  const to = config.emailRecipients ?? [];
  if (!key) return { channel: "email", ok: false, skipped: true, error: "RESEND_API_KEY is not set" };
  if (!to.length)
    return { channel: "email", ok: false, skipped: true, error: "no emailRecipients configured" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: config.emailFrom,
      to,
      subject,
      text: `${bodyText}\n\nFull report: ${SITE}/seo-report\n`,
    }),
  });
  if (!res.ok) {
    return { channel: "email", ok: false, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
  }
  return { channel: "email", ok: true, recipients: to };
}

/**
 * Sends an alert for one check.
 *
 * @param {object} input
 * @param {string} input.check    check id, e.g. "indexing"
 * @param {string} input.label    human label
 * @param {string} input.status   pass | warn | fail | skipped
 * @param {string} input.summary  one-line summary
 * @param {Array<{route:string,rule:string,message:string}>} [input.issues]
 * @param {string[]} [input.regressions] keys new since the previous run
 * @param {boolean} [input.dryRun]
 */
export async function sendAlert({ check, label, status, summary, issues = [], regressions = [], dryRun = false }) {
  const config = loadAlertConfig();
  if (!config.enabled) return [];
  if (!(config.notifyOn ?? ["fail"]).includes(status)) return [];

  const emoji = status === "fail" ? "🚨" : "⚠️";
  const title = `${emoji} ${label} — ${status.toUpperCase()}`;
  const lines = [
    summary,
    regressions.length ? `\n*New since last run (${regressions.length}):*` : "",
    ...regressions.slice(0, 10).map((r) => `• ${r.split("|").join(" — ")}`),
    issues.length ? `\n*Issues (${issues.length}):*` : "",
    ...issues.slice(0, 15).map((i) => `• [${i.rule}] ${i.route}: ${i.message}`),
  ].filter(Boolean);
  const body = lines.join("\n");

  if (dryRun) {
    console.log(`\n[alerts dry-run] ${title}\n${body}`);
    return [{ channel: "dry-run", ok: true }];
  }

  const results = await Promise.all([
    sendSlack(title, body, config).catch((e) => ({ channel: "slack", ok: false, error: String(e.message) })),
    sendEmail(`[Zero-Form AVA] ${title}`, `${summary}\n\n${body.replace(/[*•]/g, "-")}`, config).catch((e) => ({
      channel: "email",
      ok: false,
      error: String(e.message),
    })),
  ]);

  logDelivery({ check, status, summary, results });
  for (const r of results) {
    const state = r.ok ? "sent" : r.skipped ? "skipped" : "FAILED";
    console.log(`  alert ${r.channel}: ${state}${r.error ? ` (${r.error})` : ""}`);
  }
  return results;
}

// CLI: alert on every failing section of the current report.
if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes("--dry-run");
  const report = readReport();
  const failing = Object.values(report.sections ?? {}).filter(
    (s) => s.status === "fail" || s.status === "warn",
  );
  if (!failing.length) {
    console.log("Alerts — nothing to report, all checks pass.");
  }
  for (const section of failing) {
    await sendAlert({
      check: section.name,
      label: section.label,
      status: section.status,
      summary: section.summary,
      issues: section.issues ?? [],
      dryRun,
    });
  }
}
