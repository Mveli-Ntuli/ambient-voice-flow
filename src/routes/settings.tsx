import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";

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
        <p className="text-sm text-muted-foreground">Settings panel coming soon.</p>
      </div>
    </div>
  );
}
