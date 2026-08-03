export type SchedulePeriod = "daily" | "weekly" | "monthly";

export type ReportSchedule = {
  id: string;
  period: SchedulePeriod;
  timeOfDay: string; // HH:MM
  recipients: string[];
  enabled: boolean;
  createdBy: string;
  lastSentAt: number | null;
};

const KEY = "ava_report_schedules";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseRecipients(raw: string) {
  const parts = raw
    .split(/[,;\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const valid = parts.filter((p) => EMAIL_RE.test(p));
  const invalid = parts.filter((p) => !EMAIL_RE.test(p));
  return { valid: [...new Set(valid)], invalid };
}

export function readSchedules(): ReportSchedule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as ReportSchedule[]) : [];
  } catch {
    return [];
  }
}

export function writeSchedules(list: ReportSchedule[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

export function describeSchedule(s: ReportSchedule) {
  const when =
    s.period === "daily"
      ? `every day at ${s.timeOfDay}`
      : s.period === "weekly"
        ? `every Monday at ${s.timeOfDay}`
        : `on the 1st of each month at ${s.timeOfDay}`;
  return `${s.period} report · ${when} · ${s.recipients.length} recipient${s.recipients.length === 1 ? "" : "s"}`;
}

/** Builds a mailto dispatch for the generated report body. */
export function buildDispatchLink(subject: string, body: string, recipients: string[]) {
  return `mailto:${recipients.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    body.slice(0, 1800),
  )}`;
}
