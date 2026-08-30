import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
  Gauge,
  Link2,
  MinusCircle,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import { seoReport } from "@/generated/seo-report";
import type { SeoSection, SeoStatus } from "@/lib/seo-report-types";

export const Route = createFileRoute("/seo-report")({
  head: () => ({
    meta: [
      { title: "SEO Quality Report — Zero-Form AVA" },
      {
        name: "description",
        content:
          "Internal SEO quality dashboard: metadata baseline, structured data validation, broken links, Lighthouse thresholds and indexing status with regression history.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "SEO Quality Report — Zero-Form AVA" },
      {
        property: "og:description",
        content:
          "Internal SEO quality dashboard with metadata, structured data, link, Lighthouse and indexing results.",
      },
      { property: "og:url", content: "https://ambient-voice-flow.lovable.app/seo-report" },
    ],
    links: [{ rel: "canonical", href: "https://ambient-voice-flow.lovable.app/seo-report" }],
  }),
  component: SeoReportPage,
});

const ICONS: Record<string, typeof Gauge> = {
  "seo-check": ScanSearch,
  "schema-check": ShieldCheck,
  "link-check": Link2,
  lighthouse: Gauge,
  indexing: Activity,
};

const STATUS_STYLES: Record<SeoStatus, string> = {
  pass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  fail: "border-red-500/40 bg-red-500/10 text-red-300",
  skipped: "border-white/15 bg-white/[0.04] text-muted-foreground",
};

const ORDER = ["seo-check", "schema-check", "link-check", "lighthouse", "indexing"];

function formatDate(value?: string) {
  if (!value) return "never";
  return new Date(value).toLocaleString();
}

function StatusPill({ status }: { status: SeoStatus }) {
  const Icon =
    status === "pass"
      ? CheckCircle2
      : status === "warn"
        ? AlertTriangle
        : status === "fail"
          ? FileWarning
          : MinusCircle;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[status]}`}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

function SectionCard({ section }: { section: SeoSection }) {
  const Icon = ICONS[section.name] ?? ScanSearch;
  const scores = (section.meta?.scores ?? null) as Record<string, number> | null;
  const thresholds = (section.meta?.thresholds ?? null) as Record<string, number> | null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold">{section.label}</h2>
            <p className="text-[11px] text-muted-foreground">
              Last run {formatDate(section.ranAt)}
            </p>
          </div>
        </div>
        <StatusPill status={section.status} />
      </div>

      <p className="text-sm text-muted-foreground">{section.summary}</p>

      {scores ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {Object.entries(scores).map(([category, score]) => {
            const min = thresholds?.[category];
            const ok = min === undefined || score >= min;
            return (
              <div
                key={category}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2"
              >
                <span className="text-xs capitalize text-muted-foreground">
                  {category.replace(/-/g, " ")}
                </span>
                <span className={`text-sm font-semibold ${ok ? "text-emerald-300" : "text-red-300"}`}>
                  {score}
                  {min !== undefined && (
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                      / min {min}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {section.issues.length ? (
        <ul className="mt-4 space-y-2">
          {section.issues.map((issue, i) => (
            <li
              key={`${issue.route}-${issue.rule}-${i}`}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs"
            >
              <span className="mr-2 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                {issue.rule}
              </span>
              <span className="font-medium text-foreground">{issue.route}</span>
              <span className="text-muted-foreground"> — {issue.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-emerald-300/80">No issues detected in the latest run.</p>
      )}
    </div>
  );
}

function SeoReportPage() {
  const [filter, setFilter] = useState<"all" | "regression" | "fix">("all");

  const sections = useMemo(
    () =>
      ORDER.map((name) => seoReport.sections[name]).filter(Boolean) as SeoSection[],
    [],
  );

  const history = useMemo(() => {
    const events = [...(seoReport.history ?? [])].reverse();
    return filter === "all" ? events : events.filter((e) => e.type === filter);
  }, [filter]);

  const totals = useMemo(() => {
    const issues = sections.reduce((sum, s) => sum + s.issues.length, 0);
    const failing = sections.filter((s) => s.status === "fail").length;
    const regressions = (seoReport.history ?? []).filter((e) => e.type === "regression").length;
    const fixes = (seoReport.history ?? []).filter((e) => e.type === "fix").length;
    return { issues, failing, regressions, fixes };
  }, [sections]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <ScanSearch className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">SEO Quality Report</h1>
          <p className="text-sm text-muted-foreground">
            Latest build-time audit results — generated {formatDate(seoReport.generatedAt)}.
          </p>
        </div>
      </header>

      <div className="mb-8 grid gap-3 sm:grid-cols-4">
        {[
          { label: "Open issues", value: totals.issues, tone: totals.issues ? "text-amber-300" : "text-emerald-300" },
          { label: "Failing checks", value: totals.failing, tone: totals.failing ? "text-red-300" : "text-emerald-300" },
          { label: "Regressions logged", value: totals.regressions, tone: "text-red-300" },
          { label: "Fixes logged", value: totals.fixes, tone: "text-emerald-300" },
        ].map((tile) => (
          <div
            key={tile.label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl"
          >
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {tile.label}
            </div>
            <div className={`mt-1 font-display text-2xl font-bold ${tile.tone}`}>{tile.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <SectionCard key={section.name} section={section} />
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Regression &amp; fix history</h2>
          </div>
          <div className="flex gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
            {(["all", "regression", "fix"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={`rounded-lg px-3 py-1 text-[11px] font-semibold capitalize transition ${
                  filter === option
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option === "fix" ? "fixes" : option === "regression" ? "regressions" : "all"}
              </button>
            ))}
          </div>
        </div>

        {history.length ? (
          <ul className="space-y-2">
            {history.map((event, i) => {
              const [route, rule, message] = event.key.split("|");
              return (
                <li
                  key={`${event.at}-${i}`}
                  className="flex flex-wrap items-start gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs"
                >
                  {event.type === "regression" ? (
                    <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-300" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                  )}
                  <span className="font-medium text-foreground">{route}</span>
                  {rule ? <span className="text-primary">{rule}</span> : null}
                  <span className="flex-1 text-muted-foreground">{message ?? event.key}</span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {event.check} · {formatDate(event.at)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No regressions or fixes recorded yet — history fills up as builds run the audit scripts.
          </p>
        )}
      </section>

      <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
        Run locally with <code className="text-primary">bun run seo:audit</code> (metadata, structured
        data, links, Lighthouse) or <code className="text-primary">bun run seo:indexing</code> to
        re-check Google indexing of every sitemap URL. Strict mode
        (<code className="text-primary">seo:audit:strict</code>) fails the build on regressions and
        threshold drops.
      </p>
    </div>
  );
}
