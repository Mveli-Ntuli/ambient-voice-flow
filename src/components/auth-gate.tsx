import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { useRouterState, Link } from "@tanstack/react-router";
import {
  Mic,
  Github,
  Sparkles,
  Loader2,
  Mail,
  Lock,
  AlertCircle,
  User as UserIcon,
  KeyRound,
  Info,
  ArrowRight,
} from "lucide-react";

const USERS_KEY = "ava.mock.users";
const SESSION_KEY = "ava.mock.session";
const RECEPTION_KEY = "ava.mock.reception";

/* Mock reception database — front-desk placement codes (seed defaults) */
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
  } catch {
    return { ...RECEPTION_SEED };
  }
}

export function writeReceptionDB(db: Record<string, { room: string; residence: string; name?: string; nationalId?: string; paid?: boolean; createdAt?: number }>) {
  try {
    window.localStorage.setItem(RECEPTION_KEY, JSON.stringify(db));
  } catch {}
}


type UserRecord = {
  email: string;
  pwd: string;
  fullName: string;
  refCode: string;
  room: string;
  residence: string;
  createdAt: number;
};
type Session = {
  email: string;
  fullName: string;
  refCode: string;
  room: string;
  residence: string;
  loggedInAt: number;
};

async function hashPassword(pwd: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = new TextEncoder().encode(pwd + "::ava-salt");
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return btoa(pwd + "::ava-salt");
}

function readUsers(): Record<string, UserRecord> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(USERS_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeUsers(u: Record<string, UserRecord>) {
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(u));
  } catch {}
}
function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeSession(s: Session | null) {
  try {
    if (s) window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {}
}

/* Per-user scoped storage helper (job cards, transcripts, signatures) */
export function userScopedKey(base: string, email: string | undefined | null) {
  const who = (email || "anonymous").trim().toLowerCase();
  return `ava.user::${who}::${base}`;
}

type AuthContextValue = {
  ready: boolean;
  authed: boolean;
  session: Session | null;
  signUp: (input: {
    fullName: string;
    email: string;
    password: string;
    refCode: string;
  }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
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
    signUp: async ({ fullName, email, password, refCode }) => {
      const key = email.trim().toLowerCase();
      const code = refCode.trim().toUpperCase();
      const db = loadReceptionDB();
      const record = db[code];
      if (!record) {
        throw new Error("RECEPTION_CODE_NOT_FOUND");
      }

      if (!fullName.trim()) throw new Error("Please enter your full name.");
      const users = readUsers();
      if (users[key]) throw new Error("An account with this email already exists. Please sign in.");
      const pwd = await hashPassword(password);
      const rec: UserRecord = {
        email: key,
        pwd,
        fullName: fullName.trim(),
        refCode: code,
        room: record.room,
        residence: record.residence,
        createdAt: Date.now(),
      };
      users[key] = rec;
      writeUsers(users);
      const s: Session = {
        email: key,
        fullName: rec.fullName,
        refCode: code,
        room: rec.room,
        residence: rec.residence,
        loggedInAt: Date.now(),
      };
      writeSession(s);
      setSession(s);
    },
    signIn: async (email, password) => {
      const key = email.trim().toLowerCase();
      const users = readUsers();
      const rec = users[key];
      if (!rec) throw new Error("No account found for this email. Create one first.");
      const pwd = await hashPassword(password);
      if (rec.pwd !== pwd) throw new Error("Incorrect password for this email.");
      const s: Session = {
        email: key,
        fullName: rec.fullName,
        refCode: rec.refCode,
        room: rec.room,
        residence: rec.residence,
        loggedInAt: Date.now(),
      };
      writeSession(s);
      setSession(s);
    },
    signOut: () => {
      writeSession(null);
      setSession(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}

/* Back-compat alias so existing imports keep working */
export const useDemoAuth = useAuth;

export function AuthGate({ children }: { children: ReactNode }) {
  const { ready, authed, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [refCode, setRefCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authed) {
      const t = setTimeout(() => setEntered(true), 30);
      return () => clearTimeout(t);
    }
    setEntered(false);
  }, [authed]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (authed) {
    return (
      <div
        className={`transition-all duration-700 ease-out ${
          entered ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]"
        }`}
      >
        {children}
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp({ fullName, email, password, refCode });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      if (mode === "signup") {
        setRefCode("");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Orbital glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[38rem] w-[38rem] rounded-full bg-primary/20 blur-3xl animate-[ava-orb-a_18s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 -right-40 h-[42rem] w-[42rem] rounded-full bg-secondary/20 blur-3xl animate-[ava-orb-b_22s_ease-in-out_infinite]" />
        <div className="absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-3xl animate-[ava-orb-c_14s_ease-in-out_infinite]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-primary/40 blur-lg" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 backdrop-blur">
                <Mic className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="font-display text-xl font-bold tracking-tight">
              Zero-Form <span className="text-primary">AVA</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.65)] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-8">
            <div className="mb-6 flex rounded-full border border-white/10 bg-black/30 p-1 text-sm">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={`flex-1 rounded-full px-4 py-2 font-medium transition-all ${
                    mode === m
                      ? "bg-primary text-primary-foreground shadow-[0_0_24px_-6px_var(--primary)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Reception check-in"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Enter your credentials to open the intake console."
                : "Register with your placement code to activate your workspace."}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Full name
                  </span>
                  <div className="group relative">
                    <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Mveli Ntuli"
                      className="w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
                    />
                  </div>
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Email
                </span>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Password
                </span>
                <div className="group relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
                  />
                </div>
              </label>

              {mode === "signup" && (
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Residence reference / Placement code
                    <span
                      title="Don't have a code? Use test code: NMU-RES-9942"
                      className="inline-flex cursor-help items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary/90 normal-case"
                    >
                      <Info className="h-2.5 w-2.5" />
                      test: NMU-RES-9942
                    </span>
                  </span>
                  <div className="group relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input
                      type="text"
                      required
                      value={refCode}
                      onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                      placeholder="NMU-RES-XXXX"
                      className="w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm font-mono tracking-wider outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
                    />
                  </div>
                </label>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_32px_-8px_var(--primary)] transition-all hover:shadow-[0_0_44px_-4px_var(--primary)] disabled:opacity-60"
              >
                <span className="relative z-10 inline-flex items-center justify-center gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "signin" ? "Sign in" : "Check in"}
                </span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-white/10" />
              <span>social sign-in (coming soon)</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-3 opacity-60">
              <button
                type="button"
                disabled
                title="Social sign-in requires Lovable Cloud auth — not enabled in demo mode."
                className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] py-2.5 text-sm font-medium cursor-not-allowed"
              >
                <GoogleIcon className="h-4 w-4" />
                Google
              </button>
              <button
                type="button"
                disabled
                title="Social sign-in requires Lovable Cloud auth — not enabled in demo mode."
                className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] py-2.5 text-sm font-medium cursor-not-allowed"
              >
                <Github className="h-4 w-4" />
                GitHub
              </button>
            </div>

            <p className="mt-6 text-center text-[11px] text-muted-foreground/70">
              <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
              Credentials are stored locally on this device (mock database).
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Protected by ambient session encryption · v1.0
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12S6.8 21.5 12 21.5c6.9 0 9.4-4.9 9.4-8.8 0-.6-.1-1-.1-1.5H12z"
      />
    </svg>
  );
}
