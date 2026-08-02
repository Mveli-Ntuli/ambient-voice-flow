import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LogInput = z.object({
  actorEmail: z.string().min(1).max(200),
  actorBadge: z.string().max(80).default(""),
  department: z.string().max(40).default("police"),
  action: z.string().min(1).max(120),
  category: z.string().max(60).default("general"),
  summary: z.string().max(600).default(""),
  details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  durationMs: z.number().int().nonnegative().optional(),
});

export type ActivityRow = {
  id: string;
  actor_email: string;
  actor_badge: string;
  department: string;
  action: string;
  category: string;
  summary: string;
  details: Record<string, string | number | boolean | null> | null;
  duration_ms: number | null;
  occurred_at: string;
};

export const logActivity = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => LogInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("activity_logs" as never).insert({
      actor_email: data.actorEmail.toLowerCase(),
      actor_badge: data.actorBadge,
      department: data.department,
      action: data.action,
      category: data.category,
      summary: data.summary,
      details: (data.details ?? {}) as never,
      duration_ms: data.durationMs ?? null,
    } as never);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

const ListInput = z.object({
  department: z.string().max(40).optional(),
  days: z.number().int().min(1).max(365).default(30),
  limit: z.number().int().min(1).max(500).default(200),
  from: z.string().max(40).optional(),
  to: z.string().max(40).optional(),
});

export const listActivity = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ListInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = data.from
      ? new Date(`${data.from}T00:00:00.000Z`).toISOString()
      : new Date(Date.now() - data.days * 86400_000).toISOString();
    let query = supabaseAdmin
      .from("activity_logs" as never)
      .select("*")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(data.limit);
    if (data.to) query = query.lte("occurred_at", new Date(`${data.to}T23:59:59.999Z`).toISOString());
    if (data.department) query = query.eq("department", data.department);
    const { data: rows, error } = await query;
    if (error) return { rows: [] as ActivityRow[], error: error.message };
    return { rows: (rows ?? []) as unknown as ActivityRow[], error: null as string | null };
  });


const ProfileInput = z.object({
  email: z.string().min(1).max(200),
  badge: z.string().max(80).default(""),
  department: z.string().max(40).default("police"),
  displayName: z.string().max(120).default(""),
});

export const ensureOfficerProfile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ProfileInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const { data: existing } = await supabaseAdmin
      .from("officer_profiles" as never)
      .select("email, has_completed_onboarding")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return {
        hasCompletedOnboarding: Boolean(
          (existing as unknown as { has_completed_onboarding: boolean }).has_completed_onboarding,
        ),
      };
    }

    await supabaseAdmin.from("officer_profiles" as never).insert({
      email,
      badge: data.badge,
      department: data.department,
      display_name: data.displayName,
    } as never);
    return { hasCompletedOnboarding: false };
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ email: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("officer_profiles" as never)
      .update({
        has_completed_onboarding: true,
        onboarding_completed_at: new Date().toISOString(),
      } as never)
      .eq("email", data.email.toLowerCase());
    return { ok: !error };
  });
