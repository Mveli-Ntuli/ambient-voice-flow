import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon, LogOut, User } from "lucide-react";
import { useDemoAuth } from "@/components/auth-gate";
import { SecurityRescanPanel } from "@/components/security-rescan";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Team — Zero-Form AVA" },
      { name: "description", content: "Workspace, team, and integration settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { session, signOut } = useDemoAuth();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <SettingsIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Settings &amp; Team</h1>
          <p className="text-sm text-muted-foreground">Manage workspace preferences and members.</p>
        </div>
      </header>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/40 bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Signed in as</div>
            <div className="font-display text-lg font-semibold truncate">
              {session?.email ?? "—"}
            </div>
          </div>
        </div>

        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>

      <SecurityRescanPanel />
    </div>
    </div>
  );
}
