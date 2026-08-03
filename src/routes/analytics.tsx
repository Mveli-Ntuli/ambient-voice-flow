import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Sparkles,
  Loader2,
  Radio,
  Clock,
  Users,
  Activity,
  AlertCircle,
  Megaphone,
  RefreshCw,
  CalendarRange,
  FileSpreadsheet,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { useDepartment } from "@/lib/department";
import { useDemoAuth } from "@/components/auth-gate";
import { listActivity, type ActivityRow } from "@/lib/activity.functions";
import { generateOperationsReport, type ReportResult } from "@/lib/ai-reports.functions";
import { recordActivity } from "@/lib/activity";
import { exportActivityCsv, exportActivityPdf, exportReportPdf, downloadCsv } from "@/lib/export-utils";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "AI Reporting & Analytics — Zero-Form AVA" },
      {
        name: "description",
        content:
          "AI-generated daily, weekly and monthly operations reports, officer performance metrics and a verified activity trail.",
      },
      { property: "og:title", content: "AI Reporting & Analytics — Zero-Form AVA" },
      {
        property: "og:description",
        content: "AI operations reports, officer performance metrics and a verified activity trail.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ambient-voice-flow.lovable.app/analytics" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://ambient-voice-flow.lovable.app/analytics" }],
  }),

  component: AnalyticsPage,
});

type Period = "daily" | "weekly" | "monthly";

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => dayKey(new Date(Date.now() - n * 86400_000));
const PERIOD_DAYS: Record<Period, number> = { daily: 1, weekly: 7, monthly: 30 };

function AnalyticsPage() {
  const { department } = useDepartment();
  const { session } = useDemoAuth();
  const accent = department?.theme.accentHex ?? "#10B981";

  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [period, setPeriod] = useState<Period>("daily");
  const [report, setReport] = useState<ReportResult | null>(null);
  const [busy, setBusy] = useState<null | "report" | "broadcast">(null);
  const [broadcast, setBroadcast] = useState<string>("");

  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(dayKey(new Date()));
  const rangeInvalid = from > to;

  const loadRows = async (range?: { from: string; to: string }) => {
    const r = range ?? { from, to };
    if (r.from > r.to) {
      toast.error("Start date must be on or before the end date.");
      return;
    }
    setLoadingRows(true);
    try {
      const res = await listActivity({ data: { from: r.from, to: r.to, limit: 500 } });
      setRows(res.rows);
    } catch {
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  };

  useEffect(() => {
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPreset = (p: Period) => {
    setPeriod(p);
    const next = { from: daysAgo(PERIOD_DAYS[p] - 1), to: dayKey(new Date()) };
    setFrom(next.from);
    setTo(next.to);
    void loadRows(next);
  };

  const metrics = useMemo(() => {
    const officers = new Set(rows.map((r) => r.actor_badge || r.actor_email));
    const durations = rows.map((r) => r.duration_ms).filter((d): d is number => typeof d === "number");
    const byCategory = new Map<string, number>();
    rows.forEach((r) => byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1));
    const today = dayKey(new Date());
    return {
      total: rows.length,
      today: rows.filter((r) => r.occurred_at.slice(0, 10) === today).length,
      officers: officers.size,
      avgResponse: durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 1000)
        : 0,
      categories: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
      officerBoard: [...officers]
        .map((who) => ({
          who,
          count: rows.filter((r) => (r.actor_badge || r.actor_email) === who).length,
          last: rows.find((r) => (r.actor_badge || r.actor_email) === who)?.occurred_at ?? "",
        }))
        .sort((a, b) => b.count - a.count),
    };
  }, [rows]);

  const log = (action: string, category: string, summary: string) => {
    if (!session?.email) return;
    recordActivity({
      actorEmail: session.email,
      actorBadge: session.badge,
      department: session.department,
      action,
      category,
      summary,
    });
  };

  const runAi = async (mode: "report" | "broadcast") => {
    if (rangeInvalid) {
      toast.error("Fix the date range before generating a report.");
      return;
    }
    setBusy(mode);
    if (mode === "report") setReport(null);
    else setBroadcast("");
    try {
      const res = await generateOperationsReport({
        data: { period, department: department?.key, mode, from, to },
      });
      if (!res.ok) {
        toast.error(res.error ?? "The AI analyst could not complete this request.");
      } else {
        toast.success(mode === "broadcast" ? "Broadcast summary ready." : `${period} report generated.`);
        log(
          mode === "broadcast" ? "Broadcast summary generated" : "Operations report generated",
          "reporting",
          `${period} · ${from} → ${to} · ${res.stats.total} logged actions analysed`,
        );
      }
      if (mode === "broadcast") setBroadcast(res.text);
      else setReport(res);
      void loadRows();
    } catch {
      toast.error("The AI service is unreachable right now.");
    } finally {
      setBusy(null);
    }
  };

  const exportReport = (kind: "csv" | "pdf") => {
    const text = report?.ok ? report.text : "";
    if (!text) {
      toast.error("Generate a report first — there is nothing to export yet.");
      return;
    }
    if (kind === "pdf") {
      exportReportPdf({
        title: `${period.toUpperCase()} Operations Report`,
        subtitle: `${department?.agency ?? "All departments"} · ${from} → ${to}`,
        body: text,
        accent,
        filename: `operations-report_${period}_${from}_to_${to}.pdf`,
      });
    } else {
      const stats = report?.stats;
      downloadCsv(
        `operations-report_${period}_${from}_to_${to}.csv`,
        ["Metric", "Value"],
        [
          ["Period", period],
          ["Range start", from],
          ["Range end", to],
          ["Total actions", stats?.total ?? 0],
          ["Active officers", stats?.officers ?? 0],
          ["Avg duration (ms)", stats?.avgDurationMs ?? 0],
          ...(stats?.byCategory ?? []).map((c) => [`Category · ${c.key}`, c.count] as (string | number)[]),
          ...(stats?.byDay ?? []).map((d) => [`Day · ${d.day}`, d.count] as (string | number)[]),
          ...(stats?.topOfficers ?? []).map((o) => [`Officer · ${o.badge}`, o.count] as (string | number)[]),
          ["Narrative", text],
        ],
      );
    }
    toast.success(`Report exported as ${kind.toUpperCase()}.`);
    log("Report exported", "export", `${period} report · ${kind.toUpperCase()} · ${from} → ${to}`);
  };

  const exportTrail = (kind: "csv" | "pdf") => {
    if (rows.length === 0) {
      toast.error("No activity in this range to export.");
      return;
    }
    if (kind === "csv") exportActivityCsv(rows, { from, to });
    else exportActivityPdf(rows, { from, to }, accent);
    toast.success(`Activity trail exported as ${kind.toUpperCase()}.`);
    log("Activity trail exported", "export", `${rows.length} entries · ${kind.toUpperCase()} · ${from} → ${to}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-4 sm:px-6">
      <header className="mb-6 flex flex-col gap-y-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl border"
            style={{ background: `${accent}22`, borderColor: `${accent}55` }}
          >
            <BarChart3 className="h-5 w-5" style={{ color: accent }} />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Verified operational data
            </div>
            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight">
              AI Reporting &amp; Analytics
            </h1>
          </div>
        </div>
        <button
          onClick={() => void loadRows()}
          className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingRows ? "animate-spin" : ""}`} />
          Refresh data
        </button>
      </header>

      {/* Date range */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.55)] p-4 backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2">
          <CalendarRange className="h-4 w-4" style={{ color: accent }} />
          <h2 className="font-display text-xs font-bold uppercase tracking-widest">Date range</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">From</span>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className={`rounded-lg border bg-black/30 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/25 ${
                rangeInvalid ? "border-amber-500/60" : "border-white/10 focus:border-primary/60"
              }`}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">To</span>
            <input
              type="date"
              value={to}
              min={from}
              max={dayKey(new Date())}
              onChange={(e) => setTo(e.target.value)}
              className={`rounded-lg border bg-black/30 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/25 ${
                rangeInvalid ? "border-amber-500/60" : "border-white/10 focus:border-primary/60"
              }`}
            />
          </label>
          <button
            onClick={() => void loadRows()}
            disabled={rangeInvalid}
            className="rounded-lg border border-white/15 bg-white/[0.05] px-4 py-2 text-xs font-bold uppercase tracking-widest transition hover:bg-white/[0.1] disabled:opacity-50"
          >
            Apply range
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Quick ranges:</span>
          {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold capitalize text-muted-foreground transition hover:text-foreground"
            >
              {p === "daily" ? "Today" : p === "weekly" ? "Last 7 days" : "Last 30 days"}
            </button>
          ))}
        </div>
        {rangeInvalid ? (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-300">
            <AlertCircle className="h-3.5 w-3.5" /> The start date must be on or before the end date.
          </p>
        ) : (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Showing {rows.length} logged actions between {from} and {to}. Reports and exports use this range.
          </p>
        )}
      </div>

      {/* Metric tiles */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon={Activity} label="Logged actions (range)" value={String(metrics.total)} accent={accent} />
        <Tile icon={Radio} label="Actions today" value={String(metrics.today)} accent={accent} />
        <Tile icon={Users} label="Active officers" value={String(metrics.officers)} accent={accent} />
        <Tile
          icon={Clock}
          label="Avg handling time"
          value={metrics.avgResponse ? `${metrics.avgResponse}s` : "—"}
          accent={accent}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* AI reports */}
        <section className="lg:col-span-3 flex flex-col gap-y-4">
          <div className="rounded-3xl border border-white/10 bg-[rgba(15,23,42,0.55)] p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: accent }} />
              <h2 className="font-display text-sm font-bold uppercase tracking-widest">
                AI Operations Report
              </h2>
            </div>

            <div className="mb-4 flex rounded-lg border border-white/10 bg-black/30 p-1 text-xs font-semibold">
              {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-1 rounded-md px-3 py-2 capitalize transition-all ${
                    period === p ? "bg-white/10 text-foreground shadow-inner" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => runAi("report")}
                disabled={busy !== null || rangeInvalid}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-widest text-white transition disabled:opacity-60"
                style={{ background: accent, boxShadow: `0 0 36px -10px ${accent}` }}
              >
                {busy === "report" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate {period} report
              </button>
              <button
                onClick={() => runAi("broadcast")}
                disabled={busy !== null || rangeInvalid}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] py-3 text-xs font-bold uppercase tracking-widest text-foreground transition hover:bg-white/[0.08] disabled:opacity-60"
              >
                {busy === "broadcast" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                Generate broadcast summary
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <ExportButton icon={FileSpreadsheet} label="Report CSV" onClick={() => exportReport("csv")} />
              <ExportButton icon={FileDown} label="Report PDF" onClick={() => exportReport("pdf")} />
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Reports are written by AI from the verified activity log for the selected range only. Review every
              figure before distributing it outside your unit.
            </p>

            {report && !report.ok && report.error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{report.error}</span>
              </div>
            )}

            {report?.ok && report.text && (
              <article className="mt-5 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 p-5 text-sm leading-relaxed text-foreground/90">
                {report.text}
              </article>
            )}
          </div>

          {broadcast && (
            <div className="rounded-3xl border border-white/10 bg-[rgba(15,23,42,0.55)] p-6 shadow-2xl backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2">
                <Megaphone className="h-4 w-4" style={{ color: accent }} />
                <h2 className="font-display text-sm font-bold uppercase tracking-widest">
                  Broadcast Summary
                </h2>
              </div>
              <p className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 p-5 text-sm leading-relaxed text-foreground/90">
                {broadcast}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    void navigator.clipboard?.writeText(broadcast);
                    toast.success("Broadcast copied to clipboard.");
                  }}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  Copy for distribution
                </button>
                <ExportButton
                  icon={FileDown}
                  label="Broadcast PDF"
                  onClick={() => {
                    exportReportPdf({
                      title: "Broadcast Summary",
                      subtitle: `${department?.agency ?? "All departments"} · ${from} → ${to}`,
                      body: broadcast,
                      accent,
                      filename: `broadcast-summary_${from}_to_${to}.pdf`,
                    });
                    toast.success("Broadcast exported as PDF.");
                    log("Broadcast exported", "export", `PDF · ${from} → ${to}`);
                  }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Officer performance + trail */}
        <section className="lg:col-span-2 flex flex-col gap-y-4">
          <div className="rounded-3xl border border-white/10 bg-[rgba(15,23,42,0.55)] p-6 shadow-2xl backdrop-blur-xl">
            <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-widest">
              Officer Performance
            </h2>
            {metrics.officerBoard.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No officer activity in this range. Widen the date range or capture a call to populate it.
              </p>
            ) : (
              <ul className="flex flex-col gap-y-2.5">
                {metrics.officerBoard.map((o) => (
                  <li key={o.who} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-[10px] font-bold">
                      {o.who.replace(/[^A-Z0-9]/gi, "").slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">{o.who}</span>
                      <span className="block h-1.5 overflow-hidden rounded-full bg-white/10">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.max(8, (o.count / metrics.officerBoard[0].count) * 100)}%`,
                            background: accent,
                          }}
                        />
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{o.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-[rgba(15,23,42,0.55)] p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-sm font-bold uppercase tracking-widest">Activity Trail</h2>
              <div className="flex gap-2">
                <ExportButton icon={FileSpreadsheet} label="CSV" onClick={() => exportTrail("csv")} />
                <ExportButton icon={FileDown} label="PDF" onClick={() => exportTrail("pdf")} />
              </div>
            </div>
            {loadingRows ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading verified log…
              </div>
            ) : rows.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No entries between {from} and {to}. Record or simulate a call on the Dashboard, or widen the range.
              </p>
            ) : (
              <ul className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
                {rows.slice(0, 60).map((r) => (
                  <li key={r.id} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold">{r.action}</span>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {new Date(r.occurred_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {r.actor_badge || r.actor_email} · {r.category}
                      {r.summary ? ` · ${r.summary}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {metrics.categories.length > 0 && (
            <div className="rounded-3xl border border-white/10 bg-[rgba(15,23,42,0.55)] p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-widest">
                Activity Mix
              </h2>
              <ul className="flex flex-col gap-y-2">
                {metrics.categories.map(([cat, count]) => (
                  <li key={cat} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-muted-foreground">{cat}</span>
                    <span className="font-mono">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ExportButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Activity;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:bg-white/[0.08] hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.55)] p-4 backdrop-blur-xl">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="font-display text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
