import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";

const PERIODS = { daily: 1, weekly: 7, monthly: 30 } as const;

const ReportInput = z.object({
  period: z.enum(["daily", "weekly", "monthly"]),
  department: z.string().max(40).optional(),
  mode: z.enum(["report", "broadcast"]).default("report"),
});

type Row = {
  actor_email: string;
  actor_badge: string;
  department: string;
  action: string;
  category: string;
  summary: string;
  duration_ms: number | null;
  occurred_at: string;
};

export type ReportResult = {
  ok: boolean;
  text: string;
  error: string | null;
  stats: {
    total: number;
    officers: number;
    avgDurationMs: number;
    byCategory: { key: string; count: number }[];
    byDay: { day: string; count: number }[];
    topOfficers: { badge: string; count: number }[];
  };
};

function aggregate(rows: Row[]) {
  const byCategory = new Map<string, number>();
  const byDay = new Map<string, number>();
  const byOfficer = new Map<string, number>();
  let durSum = 0;
  let durCount = 0;

  for (const r of rows) {
    byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1);
    const day = r.occurred_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    const who = r.actor_badge || r.actor_email;
    byOfficer.set(who, (byOfficer.get(who) ?? 0) + 1);
    if (typeof r.duration_ms === "number") {
      durSum += r.duration_ms;
      durCount += 1;
    }
  }

  return {
    total: rows.length,
    officers: byOfficer.size,
    avgDurationMs: durCount ? Math.round(durSum / durCount) : 0,
    byCategory: [...byCategory.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count),
    byDay: [...byDay.entries()].map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)),
    topOfficers: [...byOfficer.entries()]
      .map(([badge, count]) => ({ badge, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}

export const generateOperationsReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ReportInput.parse(input))
  .handler(async ({ data }): Promise<ReportResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const days = PERIODS[data.period];
    const since = new Date(Date.now() - days * 86400_000).toISOString();

    let query = supabaseAdmin
      .from("activity_logs" as never)
      .select("actor_email, actor_badge, department, action, category, summary, duration_ms, occurred_at")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(1000);
    if (data.department) query = query.eq("department", data.department);

    const { data: raw, error } = await query;
    const rows = (raw ?? []) as unknown as Row[];
    const stats = aggregate(rows);

    if (error) {
      return { ok: false, text: "", error: error.message, stats };
    }

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) {
      return { ok: false, text: "", error: "AI service is not configured.", stats };
    }

    if (rows.length === 0) {
      return {
        ok: false,
        text: "",
        error: "No logged activity in this period yet — record or simulate a call first.",
        stats,
      };
    }

    const { createLovableAiGatewayProvider, AI_MODEL } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const sample = rows
      .slice(0, 220)
      .map((r) => `${r.occurred_at} | ${r.department} | ${r.actor_badge || r.actor_email} | ${r.category} | ${r.action} | ${r.summary}`)
      .join("\n");

    const prompt =
      data.mode === "broadcast"
        ? `You are the duty commander's analyst. From the operational log below, write a BROADCAST SUMMARY ready for distribution to all units.
Format: a one-line headline, then 4-6 short bullet points, then a single "Command directive" line. Keep it under 180 words. No preamble.

Aggregates: ${JSON.stringify(stats)}

Log:
${sample}`
        : `You are an emergency-services operations analyst. Produce a formal ${data.period.toUpperCase()} OPERATIONS REPORT from the activity log below.
Use markdown with these sections: "## Executive Summary", "## Key Statistics", "## Trends & Patterns", "## Officer Activity", "## Response Performance", "## Recommendations".
Cite concrete numbers from the aggregates. Be factual — never invent data that is not present. Keep it under 500 words.

Aggregates: ${JSON.stringify(stats)}

Log:
${sample}`;

    try {
      const result = await generateText({
        model: gateway(AI_MODEL),
        prompt,
        providerOptions: { lovable: { reasoningEffort: "none" } },
      });
      return { ok: true, text: result.text, error: null, stats };
    } catch (e) {
      const message = e instanceof Error ? e.message : "AI request failed.";
      console.error("[ai-report]", message);
      const friendly = message.includes("429")
        ? "AI rate limit reached — please try again shortly."
        : message.includes("402")
          ? "AI credits exhausted for this workspace."
          : "The AI analyst could not complete this report.";
      return { ok: false, text: "", error: friendly, stats };
    }
  });
