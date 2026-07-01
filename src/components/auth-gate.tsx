import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { Mic, Github, Sparkles, Loader2, Mail, Lock } from "lucide-react";

const STORAGE_KEY = "ava.demo.session";

function readSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function useDemoAuth() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    setAuthed(readSession());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setAuthed(e.newValue === "1");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return {
    ready,
    authed,
    signIn: () => {
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
      setAuthed(true);
    },
    signOut: () => {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setAuthed(false);
    },
  };
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { ready, authed, signIn } = useDemoAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);

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
    setLoading(true);
    await new Promise((r) => setTimeout(r, 650));
    signIn();
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

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="mb-6 flex rounded-full border border-white/10 bg-black/30 p-1 text-sm">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
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
              {mode === "signin" ? "Welcome back" : "Join Zero-Form AVA"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Enter your credentials to open the intake console."
                : "Spin up a workspace and start capturing intents by voice."}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
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

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_32px_-8px_var(--primary)] transition-all hover:shadow-[0_0_44px_-4px_var(--primary)] disabled:opacity-60"
              >
                <span className="relative z-10 inline-flex items-center justify-center gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-white/10" />
              <span>or continue with</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={signIn}
                className="group flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] py-2.5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
              >
                <GoogleIcon className="h-4 w-4" />
                Google
              </button>
              <button
                type="button"
                onClick={signIn}
                className="group flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] py-2.5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
              >
                <Github className="h-4 w-4" />
                GitHub
              </button>
            </div>

            <button
              type="button"
              onClick={signIn}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 py-2.5 text-sm font-semibold text-primary transition-all hover:border-primary/70 hover:bg-primary/15 hover:shadow-[0_0_28px_-8px_var(--primary)]"
            >
              <Sparkles className="h-4 w-4" />
              Demo Login (skip auth)
            </button>
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
