import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Mic,
  LayoutDashboard,
  History,
  FlaskConical,
  Settings,
  ChevronLeft,
  LogOut,
} from "lucide-react";
import { useDemoAuth } from "./auth-gate";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
};
const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/history", label: "Intake History", icon: History },
  { to: "/prompt-lab", label: "Prompt Lab", icon: FlaskConical },
  { to: "/settings", label: "Settings & Team", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const { signOut } = useDemoAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const check = () => setMobile(window.matchMedia("(max-width: 767px)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isActive = (to: string, end?: boolean) =>
    end ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden md:flex flex-col transition-[width] duration-300 ease-out ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
      >
        <div className="m-3 flex flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-3 px-4 py-5">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-lg bg-primary/40 blur-md" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-primary/40 bg-primary/10">
                <Mic className="h-4 w-4 text-primary" />
              </div>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-display text-sm font-bold tracking-tight truncate">
                  Zero-Form <span className="text-primary">AVA</span>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Ambient Voice App
                </div>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-1 px-3">
            {NAV.map((item) => {
              const active = isActive(item.to, item.end);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-primary/15 text-primary shadow-[0_0_24px_-10px_var(--primary)]"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-primary shadow-[0_0_12px_var(--primary)]" />
                  )}
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {collapsed && (
                    <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md border border-white/10 bg-black/80 px-2 py-1 text-xs opacity-0 shadow-lg backdrop-blur transition-opacity group-hover:opacity-100">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-3 space-y-1">
            <button
              onClick={signOut}
              className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-white/[0.04] hover:text-foreground`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign out</span>}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md border border-white/10 bg-black/80 px-2 py-1 text-xs opacity-0 shadow-lg backdrop-blur transition-opacity group-hover:opacity-100">
                  Sign out
                </span>
              )}
            </button>
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-white/[0.04] hover:text-foreground"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft
                className={`h-4 w-4 shrink-0 transition-transform ${collapsed ? "rotate-180" : ""}`}
              />
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main
        className={`min-h-screen transition-[padding] duration-300 ease-out ${
          collapsed ? "md:pl-[76px]" : "md:pl-64"
        } pb-24 md:pb-0`}
      >
        {children}
      </main>

      {/* Mobile bottom nav */}
      {mobile && (
        <nav className="fixed inset-x-3 bottom-3 z-40 md:hidden">
          <div className="flex items-center justify-around rounded-2xl border border-white/10 bg-black/60 px-2 py-2 backdrop-blur-xl shadow-2xl">
            {NAV.map((item) => {
              const active = isActive(item.to, item.end);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-all ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                      active
                        ? "bg-primary/15 shadow-[0_0_18px_-4px_var(--primary)] scale-110"
                        : "bg-transparent scale-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="truncate">{item.label.split(" ")[0]}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
