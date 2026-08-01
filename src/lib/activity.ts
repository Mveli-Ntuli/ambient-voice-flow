import { logActivity } from "./activity.functions";

export type LogPayload = {
  actorEmail: string;
  actorBadge?: string;
  department?: string;
  action: string;
  category?: string;
  summary?: string;
  details?: Record<string, string | number | boolean | null>;
  durationMs?: number;
};

/** Fire-and-forget audit trail write. Never throws into the UI. */
export function recordActivity(payload: LogPayload) {
  if (!payload.actorEmail) return;
  void logActivity({
    data: {
      actorEmail: payload.actorEmail,
      actorBadge: payload.actorBadge ?? "",
      department: payload.department ?? "police",
      action: payload.action,
      category: payload.category ?? "general",
      summary: payload.summary ?? "",
      details: payload.details,
      durationMs: payload.durationMs,
    },
  }).catch(() => {
    /* audit logging must never break the terminal */
  });
}
