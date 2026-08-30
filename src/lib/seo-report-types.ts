export interface SeoIssue {
  route: string;
  rule: string;
  message: string;
}

export type SeoStatus = "pass" | "warn" | "fail" | "skipped";

export interface SeoSection {
  name: string;
  label: string;
  status: SeoStatus;
  summary: string;
  issues: SeoIssue[];
  ranAt: string;
  meta?: Record<string, unknown>;
}

export interface SeoHistoryEvent {
  at: string;
  check: string;
  type: "regression" | "fix";
  key: string;
}

export interface SeoReport {
  generatedAt?: string;
  sections: Record<string, SeoSection>;
  history: SeoHistoryEvent[];
}
