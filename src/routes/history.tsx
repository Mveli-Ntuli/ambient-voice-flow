import { createFileRoute } from "@tanstack/react-router";
import { History, Search } from "lucide-react";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Intake History — Zero-Form AVA" },
      { name: "description", content: "Review previously generated job cards and voice intakes." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <History className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Intake History</h1>
          <p className="text-sm text-muted-foreground">Previously generated job cards.</p>
        </div>
      </header>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 focus-within:border-primary/60">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Ask AI: 'Find all water issues this month...'"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Search in plain language — include a time frame (e.g. “this week”) and a keyword for the best results.
        </p>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          No intakes yet — records will appear here once you export a job card.
        </p>
      </div>
    </div>
  );
}
