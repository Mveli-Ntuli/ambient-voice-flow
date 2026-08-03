/** Role-based access control for reporting surfaces. */
export type AgentRole = "officer" | "supervisor" | "commander";

export const ROLE_ORDER: AgentRole[] = ["officer", "supervisor", "commander"];

export const ROLE_LABELS: Record<AgentRole, string> = {
  officer: "Field Officer",
  supervisor: "Supervisor",
  commander: "Commander",
};

export const ROLE_HELP: Record<AgentRole, string> = {
  officer: "Captures calls and generates job cards. No access to analytics or bulk exports.",
  supervisor: "Full analytics access, AI reports and CSV/PDF exports for their agency.",
  commander: "Everything a supervisor can do, plus scheduled report delivery configuration.",
};

/** Legacy accounts created before roles existed keep supervisor access. */
export function normaliseRole(role: unknown): AgentRole {
  return role === "officer" || role === "supervisor" || role === "commander" ? role : "supervisor";
}

const rank = (role: AgentRole) => ROLE_ORDER.indexOf(role);

export function canViewAnalytics(role: AgentRole | null | undefined) {
  return !!role && rank(role) >= rank("supervisor");
}

export function canExportData(role: AgentRole | null | undefined) {
  return !!role && rank(role) >= rank("supervisor");
}

export function canManageSchedules(role: AgentRole | null | undefined) {
  return role === "commander";
}
