import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  Loader2,
  Lock,
  AlertCircle,
  Shield,
  KeyRound,
  IdCard,
  Radio,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { useDepartment } from "@/lib/department";
import { DepartmentLanding } from "@/components/department-landing";

const SESSION_KEY = "ava.mock.session";
const RECEPTION_KEY = "ava.mock.reception";

/* ---------- Reception DB (kept for backward-compat with /reception route) ---------- */
const RECEPTION_SEED: Record<string, { room: string; residence: string }> = {
  "NMU-RES-9942": { room: "204B", residence: "North Campus Hall" },
  "NMU-RES-1053": { room: "112A", residence: "Marina Court" },
  "NMU-RES-2077": { room: "308C", residence: "Harbor Wing" },
};
export function loadReceptionDB(): Record<string, { room: string; residence: string; name?: string; nationalId?: string; paid?: boolean; createdAt?: number }> {
  if (typeof window === "undefined") return { ...RECEPTION_SEED };
  try {
    const stored = JSON.parse(window.localStorage.getItem(RECEPTION_KEY) || "{}");
    return { ...RECEPTION_SEED, ...stored };
  } catch { return { ...RECEPTION_SEED }; }
}
export function writeReceptionDB(db: Record<string, { room: string; residence: string; name?: string; nationalId?: string; paid?: boolean; createdAt?: number }>) {
  try { window.localStorage.setItem(RECEPTION_KEY, JSON.stringify(db)); } catch {}
}
export function userScopedKey(base: string, email: string | undefined | null) {
  const who = (email || "anonymous").trim().toLowerCase();
  return `ava.user::${who}::${base}`;
}

/* ---------- Agent session ---------- */
type Session = {
  badge: string;
  station: string;
  fullName: string;
  refCode: string;
  room: string;
  residence: string;
  email: string;
  loggedInAt: number;
};

function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeSession(s: Session | null) {
  try {
    if (s) window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {}
}

type AuthContextValue = {
  ready: boolean;
  authed: boolean;
  session: Session | null;
  signIn: (input: { badge: string; password: string; station: string }) => Promise<void>;
  signOut: () => void;
  // Legacy back-compat (no-op stubs)
  signUp: (input: { fullName: string; email: string; password: string; refCode: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setSession(readSession());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) setSession(readSession());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value: AuthContextValue = {
    ready,
    authed: !!session,
    session,
    signIn: async ({ badge, password, station }) => {
      if (!badge.trim() || !station.trim()) throw new Error("Badge and station code are required.");
      if (password.length < 4) throw new Error("Password must be at least 4 characters.");
      const s: Session = {
        badge: badge.trim().toUpperCase(),
        station: station.trim().toUpperCase(),
        fullName: `Agent ${badge.trim().toUpperCase()}`,
        refCode: station.trim().toUpperCase(),
        room: station.trim().toUpperCase(),
        residence: "Dispatch Unit",
        email: `${badge.trim().toLowerCase()}@dispatch.local`,
        loggedInAt: Date.now(),
      };
      writeSession(s);
      setSession(s);
    },
    signUp: async () => { throw new Error("Sign-up disabled in Dispatch mode."); },
    signOut: () => { writeSession(null); setSession(null); },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
export const useDemoAuth = useAuth;

/* ---------- Auth Gate ---------- */
export function AuthGate({ children }: { children: ReactNode }) {
  const { ready, authed, signIn } = useAuth();
  const { ready: deptReady, department, clear: clearDept } = useDepartment();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublicRoute = pathname === "/reception";

  const [badge, setBadge] = useState("");
  const [password, setPassword] = useState("");
  const [station, setStation] = useState("");
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authed && department) {
      const t = setTimeout(() => setEntered(true), 30);
      return () => clearTimeout(t);
    }
    setEntered(false);
  }, [authed, department]);

  if (!ready || !deptReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Public routes bypass everything
  if (isPublicRoute) return <>{children}</>;

  // STEP 1: Department selection
  if (!department) return <DepartmentLanding />;

  // STEP 3+: Authenticated
  if (authed) {
    return (
      <div className={`transition-all duration-700 ease-out ${entered ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]"}`}>
        {children}
      </div>
    );
  }

  // STEP 2: Themed agent login
  const Icon = department.icon;
  const accent = department.theme.accentHex;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn({ badge, password, station });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground font-sans">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 -left-40 h-[38rem] w-[38rem] rounded-full blur-3xl animate-[ava-orb-a_18s_ease-in-out_infinite]"
          style={{ background: `${accent}33` }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[42rem] w-[42rem] rounded-full blur-3xl animate-[ava-orb-b_22s_ease-in-out_infinite]"
          style={{ background: `${accent}22` }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md flex flex-col gap-y-6">
          <button
            type="button"
            onClick={clearDept}
            className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground hover:bg-white/[0.06]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Change agency
          </button>

          <div className="flex flex-col items-center gap-y-3 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl border shadow-inner"
              style={{ background: `${accent}22`, borderColor: `${accent}55` }}
            >
              <Icon className="h-7 w-7" style={{ color: accent }} />
            </div>
            <div className="flex flex-col gap-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                {department.tagline}
              </div>
              <div className="font-display text-2xl font-bold leading-tight tracking-tight">
                {department.agency}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.65)] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-y-2">
              <h1 className="font-display text-xl font-bold tracking-tight leading-snug">
                Secure Agent Login
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Enter your credentials to activate the command terminal.
              </p>
            </div>

            <form onSubmit={submit} className="mt-6 flex flex-col gap-y-4">
              <FormField
                label="Agent / Officer Badge Number"
                icon={IdCard}
                value={badge}
                onChange={setBadge}
                placeholder="e.g. SAPS-441982"
                mono
              />
              <FormField
                label="Password"
                icon={Lock}
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                type="password"
              />
              <FormField
                label="Dispatch Station / Unit Code"
                icon={Radio}
                value={station}
                onChange={setStation}
                placeholder="e.g. STN-04"
                mono
              />

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative mt-2 w-full overflow-hidden rounded-lg py-3 text-sm font-semibold text-primary-foreground transition-all disabled:opacity-60"
                style={{
                  background: accent,
                  boxShadow: `0 0 32px -8px ${accent}, 0 0 60px -12px ${accent}`,
                }}
              >
                <span className="relative z-10 inline-flex items-center justify-center gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Shield className="h-4 w-4" />
                  Access Command Terminal
                </span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </button>
            </form>

            <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground/70">
              <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
              Demo terminal · any badge + station accepts with 4+ char password.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
  mono,
}: {
  label: string;
  icon: typeof KeyRound;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <label className="flex flex-col gap-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="group relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <input
          type={type}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25 ${mono ? "font-mono tracking-wider" : ""}`}
        />
      </div>
    </label>
  );
}
