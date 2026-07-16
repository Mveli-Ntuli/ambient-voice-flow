import { useState } from "react";
import { Shield, ArrowRight, Radio, Sparkles } from "lucide-react";
import { DEPARTMENTS, DEPARTMENT_ORDER, useDepartment, type DepartmentKey } from "@/lib/department";

export function DepartmentLanding() {
  const { select } = useDepartment();
  const [hovered, setHovered] = useState<DepartmentKey | null>(null);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Ambient orbital glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[38rem] w-[38rem] rounded-full bg-primary/15 blur-3xl animate-[ava-orb-a_18s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 -right-40 h-[42rem] w-[42rem] rounded-full bg-secondary/15 blur-3xl animate-[ava-orb-b_22s_ease-in-out_infinite]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-12 sm:px-6">
        {/* Header — explicit gap, no absolute stacking */}
        <div className="flex w-full flex-col items-center gap-y-4 md:gap-y-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground backdrop-blur">
            <Radio className="h-3 w-3 text-primary" />
            Government Dispatch Portal
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl md:leading-[1.05]">
            Choose <span className="text-gradient">Government Agency</span>
            <br className="hidden sm:block" />
            <span className="text-foreground/90"> Portal</span>
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Select your dispatch agency to activate a secure command terminal. Each portal is themed
            and configured for its department's operational workflow.
          </p>
        </div>

        {/* Department cards */}
        <div className="mt-12 grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          {DEPARTMENT_ORDER.map((key) => {
            const d = DEPARTMENTS[key];
            const Icon = d.icon;
            const isHover = hovered === key;
            return (
              <button
                key={key}
                type="button"
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => select(key)}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[rgba(15,23,42,0.55)] p-6 text-left shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-white/20 sm:p-8"
                style={{
                  boxShadow: isHover
                    ? `0 30px 80px -20px ${d.theme.accentHex}55, 0 0 0 1px ${d.theme.accentHex}40`
                    : undefined,
                }}
              >
                {/* Themed glow */}
                <div
                  className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-40 blur-3xl transition-opacity duration-500 group-hover:opacity-70"
                  style={{ background: d.theme.accentHex }}
                />
                <div className="relative flex flex-col gap-y-5">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 shadow-inner transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${d.theme.accentHex}22`, borderColor: `${d.theme.accentHex}55` }}
                  >
                    <Icon className="h-7 w-7" style={{ color: d.theme.accentHex }} />
                  </div>
                  <div className="flex flex-col gap-y-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {d.tagline}
                    </div>
                    <div className="font-display text-2xl font-bold leading-tight tracking-tight">
                      {d.name}
                    </div>
                    <div className="text-sm leading-relaxed text-muted-foreground">
                      {d.agency}
                    </div>
                  </div>
                  <div
                    className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold transition-all group-hover:gap-3"
                    style={{ color: d.theme.accentHex, background: `${d.theme.accentHex}18`, borderColor: `${d.theme.accentHex}44` }}
                  >
                    Enter portal
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-10 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Powered by Zero-Form AVA · Ambient Voice Dispatch
        </div>
      </div>
    </div>
  );
}
