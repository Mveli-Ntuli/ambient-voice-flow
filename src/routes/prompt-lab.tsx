import { createFileRoute } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";

export const Route = createFileRoute("/prompt-lab")({
  head: () => ({
    meta: [
      { title: "Prompt Lab — Zero-Form AVA" },
      { name: "description", content: "Inspect and fine-tune the AI system prompts behind each AVA industry mode, from contractor call-outs to transport and kitchen intakes." },
      { property: "og:title", content: "Prompt Lab — Zero-Form AVA" },
      { property: "og:description", content: "Inspect and fine-tune the AI system prompts behind each AVA industry mode." },
      { property: "og:url", content: "https://ambient-voice-flow.lovable.app/prompt-lab" },
    ],
    links: [{ rel: "canonical", href: "https://ambient-voice-flow.lovable.app/prompt-lab" }],
  }),

  component: PromptLabPage,
});

const MODES = ["Contractor", "Landlord", "Hotel", "Transport", "Kitchen"];

function PromptLabPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <FlaskConical className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Prompt Lab</h1>
          <p className="text-sm text-muted-foreground">
            Inspect and tune the system instructions per industry mode.
          </p>
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {MODES.map((m) => (
          <div key={m} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display font-semibold">{m} Mode</h3>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                Active
              </span>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
{`{
  "role": "system",
  "task": "Extract structured ${m.toLowerCase()} intake",
  "schema": ["name","urgency","issue","location"]
}`}
            </pre>
            <button className="mt-4 w-full rounded-lg border border-primary/40 bg-primary/10 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary/15">
              Optimize System Prompt
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
