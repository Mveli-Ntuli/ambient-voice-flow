import { useState } from "react";
import { ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

type Finding = {
  id: string;
  title: string;
  severity: "low" | "medium" | "high";
  status: "fixed" | "remaining";
};

const MOCK_FINDINGS: Finding[] = [
  { id: "sessions_insert_null_user_id", title: "Sessions could be created without an owner", severity: "high", status: "fixed" },
  { id: "signatures_no_delete_update_policy", title: "Signature records were not write-locked", severity: "high", status: "fixed" },
  { id: "security_definer_execute_public", title: "Privileged helper functions executable by public", severity: "medium", status: "fixed" },
  { id: "sessions_all_authenticated_readable", title: "Session rows readable by all signed-in users", severity: "medium", status: "fixed" },
  { id: "user_roles_write_lock", title: "Role table write privileges restricted to admins", severity: "medium", status: "fixed" },
];

export function SecurityRescanPanel() {
  const [state, setState] = useState<"idle" | "scanning" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  const fixed = MOCK_FINDINGS.filter((f) => f.status === "fixed");
  const remaining = MOCK_FINDINGS.filter((f) => f.status === "remaining");

  function runScan() {
    if (state === "scanning") return;
    setState("scanning");
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = p + 12 + Math.random() * 10;
        if (next >= 100) {
          clearInterval(timer);
          setScannedAt(new Date().toLocaleString());
          setState("done");
          return 100;
        }
        return next;
      });
    }, 180);
  }

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/40 bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">Security posture</h2>
            <p className="text-xs text-muted-foreground">
              Simulated re-scan of database access rules and policy coverage.
            </p>
          </div>
        </div>

        <button
          onClick={runScan}
          disabled={state === "scanning"}
          className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${state === "scanning" ? "animate-spin" : ""}`} />
          {state === "scanning" ? "Scanning…" : "Run Security Re-scan"}
        </button>
      </div>

      {state === "scanning" && (
        <div className="mt-6">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Inspecting row-level policies, grants and privileged functions…
          </p>
        </div>
      )}

      {state === "done" && (
        <div className="mt-6 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-primary/30 bg-primary/[0.07] p-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Fixed</div>
              <div className="font-display text-3xl font-bold text-primary">{fixed.length}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Remaining</div>
              <div className="font-display text-3xl font-bold">{remaining.length}</div>
            </div>
          </div>

          <ul className="space-y-2">
            {MOCK_FINDINGS.map((f) => (
              <li
                key={f.id}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
              >
                {f.status === "fixed" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium">{f.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.severity} severity · {f.status === "fixed" ? "resolved" : "needs attention"}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground">
            Last scan: {scannedAt} · Demo data only — no live scanner is contacted.
          </p>
        </div>
      )}
    </section>
  );
}
