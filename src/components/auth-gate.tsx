import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Loader2,
  Lock,
  AlertCircle,
  Shield,
  KeyRound,
  IdCard,
  Mail,
  ArrowLeft,
  Sparkles,
  UserPlus,
  LogIn,
  Building2,
  Eye,
  EyeOff,
  CheckCircle2,

} from "lucide-react";
import {
  useDepartment,
  DEPARTMENTS,
  DEPARTMENT_ORDER,
  type DepartmentKey,
} from "@/lib/department";
import { DepartmentLanding } from "@/components/department-landing";
import { normaliseRole, ROLE_HELP, ROLE_LABELS, ROLE_ORDER, type AgentRole } from "@/lib/rbac";


const USERS_KEY = "ava_users_db";
const SESSION_KEY = "ava_current_session";
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

/* ---------- Password hashing (SHA-256) ---------- */
async function hashPassword(pw: string): Promise<string> {
  const buf = new TextEncoder().encode(pw);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ---------- Users DB ---------- */
type UserRecord = {
  email: string;
  badge: string;
  passwordHash: string;
  department: DepartmentKey;
  role?: AgentRole;
  createdAt: number;
};

const MASTER_SEED_PLAINTEXT = "master123";
async function seedIfEmpty() {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return;
    }
    const master: UserRecord = {
      email: "master@ava.gov",
      badge: "AVA-001",
      passwordHash: await hashPassword(MASTER_SEED_PLAINTEXT),
      department: "police",
      role: "commander",
      createdAt: Date.now(),
    };
    window.localStorage.setItem(USERS_KEY, JSON.stringify([master]));
  } catch {}
}

function readUsers(): UserRecord[] {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as UserRecord[]) : [];
  } catch { return []; }
}
function writeUsers(list: UserRecord[]) {
  try { window.localStorage.setItem(USERS_KEY, JSON.stringify(list)); } catch {}
}

/* ---------- Session ---------- */
type Session = {
  badge: string;
  email: string;
  department: DepartmentKey;
  role: AgentRole;
  loggedInAt: number;

  // legacy compat (used by dashboard code)
  fullName: string;
  refCode: string;
  room: string;
  residence: string;
  station: string;
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
  login: (input: { identifier: string; password: string }) => Promise<void>;
  register: (input: { email: string; badge: string; password: string; department: DepartmentKey }) => Promise<void>;
  signOut: () => void;
  // Legacy stubs
  signIn: (input: { badge: string; password: string; station: string }) => Promise<void>;
  signUp: (input: { fullName: string; email: string; password: string; refCode: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    (async () => {
      await seedIfEmpty();
      setSession(readSession());
      setReady(true);
    })();
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) setSession(readSession());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const buildSession = (u: UserRecord): Session => ({
    badge: u.badge,
    email: u.email,
    department: u.department,
    loggedInAt: Date.now(),
    fullName: `Agent ${u.badge}`,
    refCode: u.badge,
    room: u.badge,
    residence: DEPARTMENTS[u.department].agency,
    station: u.badge,
  });

  const value: AuthContextValue = {
    ready,
    authed: !!session,
    session,
    login: async ({ identifier, password }) => {
      const id = identifier.trim().toLowerCase();
      if (!id || !password) throw new Error("Please enter your credentials.");
      const users = readUsers();
      const user = users.find(
        (u) => u.email.toLowerCase() === id || u.badge.toLowerCase() === id
      );
      if (!user) throw new Error("Access Denied: Account does not exist.");
      const hash = await hashPassword(password);
      if (hash !== user.passwordHash) throw new Error("Access Denied: Invalid security credentials.");
      const s = buildSession(user);
      writeSession(s);
      setSession(s);
    },
    register: async ({ email, badge, password, department }) => {
      const e = email.trim().toLowerCase();
      const b = badge.trim().toUpperCase();
      if (!e || !b || !password) throw new Error("All fields are required.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error("Please enter a valid email address.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      if (!DEPARTMENTS[department]) throw new Error("Please choose a department.");
      const users = readUsers();
      if (users.some((u) => u.email.toLowerCase() === e || u.badge.toUpperCase() === b)) {
        throw new Error("Account already exists with this credential.");
      }
      const rec: UserRecord = {
        email: e,
        badge: b,
        passwordHash: await hashPassword(password),
        department,
        createdAt: Date.now(),
      };
      writeUsers([...users, rec]);
    },
    signOut: () => {
      try { window.localStorage.removeItem(SESSION_KEY); } catch {}
      setSession(null);
    },
    // Legacy back-compat
    signIn: async ({ badge, password }) => {
      await value.login({ identifier: badge, password });
    },
    signUp: async () => { throw new Error("Legacy signup disabled. Use Register."); },
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
  const { ready, authed, session, login, register } = useAuth();
  const { ready: deptReady, department, select: selectDept, clear: clearDept } = useDepartment();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublicRoute = pathname === "/reception";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [badge, setBadge] = useState("");
  const [password, setPassword] = useState("");
  const [regDept, setRegDept] = useState<DepartmentKey>("police");
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync active theme with signed-in user's department
  useEffect(() => {
    if (authed && session && (!department || department.key !== session.department)) {
      selectDept(session.department);
    }
  }, [authed, session, department, selectDept]);

  // Prefill register dept from landing selection
  useEffect(() => {
    if (department) setRegDept(department.key);
  }, [department]);

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

  if (isPublicRoute) return <>{children}</>;

  // If session exists, skip landing entirely
  if (authed) {
    return (
      <div className={`transition-all duration-700 ease-out ${entered ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]"}`}>
        {children}
      </div>
    );
  }

  // STEP 1: Department selection (only if no session and no dept picked)
  if (!department) return <DepartmentLanding />;

  const Icon = department.icon;
  const accent = department.theme.accentHex;

  const submitLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ identifier, password });
      toast.success("Access granted. Command terminal online.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ email, badge, password, department: regDept });
      toast.success("Account registered. Please sign in.");
      setIdentifier(email);
      setPassword("");
      setEmail("");
      setBadge("");
      setMode("login");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      toast.error(msg);
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
            {/* Tab toggle */}
            <div className="mb-6 flex rounded-lg border border-white/10 bg-black/30 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null); }}
                className={`flex-1 rounded-md px-3 py-2 transition-all ${mode === "login" ? "bg-white/10 text-foreground shadow-inner" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LogIn className="mr-1.5 inline h-3.5 w-3.5" /> Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setError(null); }}
                className={`flex-1 rounded-md px-3 py-2 transition-all ${mode === "register" ? "bg-white/10 text-foreground shadow-inner" : "text-muted-foreground hover:text-foreground"}`}
              >
                <UserPlus className="mr-1.5 inline h-3.5 w-3.5" /> Register
              </button>
            </div>

            <div className="flex flex-col gap-y-2">
              <h1 className="font-display text-xl font-bold tracking-tight leading-snug">
                {mode === "login" ? "Secure Agent Login" : "Register New Agent"}
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {mode === "login"
                  ? "Enter your credentials to activate the command terminal."
                  : "Provision a new operator account for this agency."}
              </p>
            </div>

            {mode === "login" ? (
              <form onSubmit={submitLogin} className="mt-6 flex flex-col gap-y-4">
                <FormField
                  label="Email or Badge ID"
                  icon={IdCard}
                  value={identifier}
                  onChange={setIdentifier}
                  placeholder="master@ava.gov or AVA-001"
                  help="Use the email you registered with, or your badge ID."
                  validate={(v) => (v.trim().length < 3 ? "Enter at least 3 characters." : null)}
                />
                <PasswordField
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  showStrength
                />

                {error && <ErrorBanner message={error} />}

                <SubmitButton loading={loading} accent={accent} label="Access Command Terminal" />
              </form>
            ) : (
              <form onSubmit={submitRegister} className="mt-6 flex flex-col gap-y-4">
                <FormField
                  label="Email Address"
                  icon={Mail}
                  value={email}
                  onChange={setEmail}
                  placeholder="agent@agency.gov"
                  type="email"
                  help="Your official agency email. Used to sign in and to identify you in the audit trail."
                  validate={(v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "Enter a valid email address.")}
                />
                <FormField
                  label="Unique Agent Badge ID"
                  icon={IdCard}
                  value={badge}
                  onChange={setBadge}
                  placeholder="e.g. SAPS-441982"
                  mono
                  help="Letters, numbers and dashes only — shown on every document you generate."
                  validate={(v) =>
                    /^[A-Za-z0-9-]{4,20}$/.test(v.trim())
                      ? null
                      : "4-20 characters, letters, numbers and dashes only."
                  }
                />
                <PasswordField
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  placeholder="At least 6 characters"
                  showStrength
                  help="Minimum 6 characters. Meet more of the hints below for a stronger credential."
                />
                <label className="flex flex-col gap-y-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Department
                  </span>
                  <div className="group relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <select
                      required
                      value={regDept}
                      onChange={(e) => setRegDept(e.target.value as DepartmentKey)}
                      className="w-full appearance-none rounded-lg border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
                    >
                      {DEPARTMENT_ORDER.map((k) => (
                        <option key={k} value={k} className="bg-slate-900">
                          {DEPARTMENTS[k].agency}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-[11px] leading-relaxed text-muted-foreground/70">
                    Determines your themed terminal, incident fields and document branding.
                  </span>
                </label>

                {error && <ErrorBanner message={error} />}

                <SubmitButton loading={loading} accent={accent} label="Register Account" />
              </form>
            )}

            <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground/70">
              <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
              Seeded master agent · <span className="font-mono">master@ava.gov</span> / <span className="font-mono">master123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function SubmitButton({ loading, accent, label }: { loading: boolean; accent: string; label: string }) {
  return (
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
        {label}
      </span>
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
    </button>
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
  help,
  validate,
}: {
  label: string;
  icon: typeof KeyRound;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
  help?: string;
  validate?: (v: string) => string | null;
}) {
  const [touched, setTouched] = useState(false);
  const problem = validate ? validate(value) : null;
  const invalid = touched && value.length > 0 && !!problem;
  const valid = value.length > 0 && !problem;

  return (
    <label className="flex flex-col gap-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="group relative">
        <Icon
          className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${
            invalid ? "text-red-400" : "text-muted-foreground group-focus-within:text-primary"
          }`}
        />
        <input
          type={type}
          required
          value={value}
          onBlur={() => setTouched(true)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={invalid}
          className={`w-full rounded-lg border bg-black/30 py-2.5 pl-9 pr-9 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:ring-2 ${
            invalid
              ? "border-red-500/60 focus:border-red-500/70 focus:ring-red-500/25"
              : valid
                ? "border-emerald-500/40 focus:border-primary/60 focus:ring-primary/25"
                : "border-white/10 focus:border-primary/60 focus:ring-primary/25"
          } ${mono ? "font-mono tracking-wider" : ""}`}
        />
        {valid && (
          <CheckCircle2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
        )}
        {invalid && (
          <AlertCircle className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-400" />
        )}
      </div>
      {invalid ? (
        <span className="text-[11px] leading-relaxed text-red-300">{problem}</span>
      ) : help ? (
        <span className="text-[11px] leading-relaxed text-muted-foreground/70">{help}</span>
      ) : null}
    </label>
  );
}


function evaluatePasswordStrength(pw: string) {
  const hints: string[] = [];
  if (pw.length < 8) hints.push("At least 8 characters");
  if (!/[A-Z]/.test(pw)) hints.push("One uppercase letter");
  if (!/[a-z]/.test(pw)) hints.push("One lowercase letter");
  if (!/[0-9]/.test(pw)) hints.push("One number");
  if (!/[^A-Za-z0-9]/.test(pw)) hints.push("One special character");
  const met = 5 - hints.length;
  const score = Math.min(4, Math.max(0, met));
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-red-500", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-500"];
  return { score, label: labels[met], color: colors[met], hints };
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  showStrength = false,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  showStrength?: boolean;
  help?: string;
}) {
  const [visible, setVisible] = useState(false);
  const strength = evaluatePasswordStrength(value);
  return (
    <label className="flex flex-col gap-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="group relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <input
          type={visible ? "text" : "password"}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pl-9 pr-10 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:text-primary focus:outline-none"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {help && value.length === 0 && (
        <span className="text-[11px] leading-relaxed text-muted-foreground/70">{help}</span>
      )}
      {showStrength && value.length > 0 && (
        <div className="flex flex-col gap-y-1.5">
          <div className="flex h-1.5 gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-full flex-1 rounded-full transition-colors duration-300 ${i <= strength.score ? strength.color : "bg-white/10"}`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{strength.label}</span>
            <span className="text-muted-foreground">{strength.score}/4</span>
          </div>
          {strength.hints.length > 0 && (
            <ul className="space-y-0.5 text-[11px] text-muted-foreground/80">
              {strength.hints.map((hint, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
                  {hint}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </label>
  );
}
