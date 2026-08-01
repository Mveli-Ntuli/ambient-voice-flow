import { useEffect, useState } from "react";
import {
  Mic,
  Sparkles,
  FileText,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
} from "lucide-react";
import { useDemoAuth } from "./auth-gate";
import { ensureOfficerProfile, completeOnboarding } from "@/lib/activity.functions";
import { recordActivity } from "@/lib/activity";

const STEPS = [
  {
    icon: Mic,
    title: "Press to record the call",
    body: "The large microphone on the Dashboard captures the live call. Speak naturally — there is no form to fill in. Use “Simulate Department Call” to see the whole flow without a real caller.",
    where: "Dashboard · left column",
  },
  {
    icon: Sparkles,
    title: "Fields fill themselves",
    body: "As the transcript streams, AVA extracts the details your agency needs and tags them with an “auto” badge. Anything it misses is flagged so you can type it in — required fields turn amber until they are complete.",
    where: "Dashboard · Intake Fields",
  },
  {
    icon: FileText,
    title: "Live document preview",
    body: "The right column always shows the exact document that will be produced. When it looks right, press “Export Secure PDF” to download the official docket.",
    where: "Dashboard · right column",
  },
  {
    icon: BarChart3,
    title: "AI reporting & analytics",
    body: "Every action you take is logged. Open Analytics for AI-written Daily, Weekly and Monthly reports, officer performance metrics, and the one-click Broadcast Summary.",
    where: "Sidebar · Analytics",
  },
  {
    icon: ShieldCheck,
    title: "Everything is audited",
    body: "Recordings, edits and exports are written to a central activity log so reporting is based on verified data. You can review it any time in Analytics → Activity Trail.",
    where: "Sidebar · Analytics",
  },
];

export function OnboardingTour() {
  const { session } = useDemoAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!session?.email) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await ensureOfficerProfile({
          data: {
            email: session.email,
            badge: session.badge,
            department: session.department,
            displayName: session.fullName,
          },
        });
        if (!cancelled && !res.hasCompletedOnboarding) {
          setStep(0);
          setOpen(true);
        }
      } catch {
        /* onboarding is non-blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.email, session?.badge, session?.department, session?.fullName]);

  const finish = async (skipped: boolean) => {
    setOpen(false);
    if (!session?.email) return;
    recordActivity({
      actorEmail: session.email,
      actorBadge: session.badge,
      department: session.department,
      action: skipped ? "Onboarding skipped" : "Onboarding completed",
      category: "onboarding",
      summary: `Walkthrough ${skipped ? "skipped" : "completed"} at step ${step + 1}/${STEPS.length}`,
    });
    try {
      await completeOnboarding({ data: { email: session.email } });
    } catch {
      /* ignore */
    }
  };

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[rgba(15,23,42,0.9)] p-6 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-20 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />

        <button
          type="button"
          onClick={() => finish(true)}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          aria-label="Skip walkthrough"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex flex-col gap-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/40 bg-primary/15">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">
                Getting started · {step + 1} of {STEPS.length}
              </div>
              <h2 className="font-display text-lg font-bold leading-tight tracking-tight">
                {current.title}
              </h2>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">{current.body}</p>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-foreground/80">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            {current.where}
          </div>

          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${
                  i <= step ? "bg-primary shadow-[0_0_12px_var(--primary)]" : "bg-white/10"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => (step === 0 ? finish(true) : setStep((s) => s - 1))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
            >
              {step === 0 ? "Skip tour" : (<><ArrowLeft className="h-3.5 w-3.5" /> Back</>)}
            </button>
            <button
              type="button"
              onClick={() => (last ? finish(false) : setStep((s) => s + 1))}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-[0_0_32px_-8px_var(--primary)] transition hover:brightness-110"
            >
              {last ? "Start using AVA" : "Next"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
