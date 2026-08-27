import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Cpu, ClipboardList, Clock, ShieldCheck } from "lucide-react";

const URL = "https://ambient-voice-flow.lovable.app/resources/ai-vs-traditional-cad";
const TITLE = "AI-Enhanced CAD vs Traditional Computer-Aided Dispatch";
const DESCRIPTION =
  "How AI-enhanced computer-aided dispatch compares to traditional CAD systems: call intake speed, transcription accuracy, data quality, auditability and cost for police, fire and EMS.";
const PUBLISHED = "2026-08-27";

export const Route = createFileRoute("/resources/ai-vs-traditional-cad")({
  head: () => ({
    meta: [
      { title: `${TITLE} — Zero-Form AVA` },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          datePublished: PUBLISHED,
          dateModified: PUBLISHED,
          mainEntityOfPage: { "@type": "WebPage", "@id": URL },
          author: { "@type": "Organization", name: "Zero-Form AVA" },
          publisher: {
            "@type": "Organization",
            name: "Zero-Form AVA",
            url: "https://ambient-voice-flow.lovable.app",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: "https://ambient-voice-flow.lovable.app/",
            },
            { "@type": "ListItem", position: 2, name: TITLE, item: URL },
          ],
        }),
      },
    ],
  }),
  component: GuidePage,
});

const COMPARISON: { area: string; traditional: string; ai: string }[] = [
  {
    area: "Call intake",
    traditional: "Dispatcher types into rigid form fields while the caller speaks.",
    ai: "Ambient capture transcribes the call and extracts fields automatically.",
  },
  {
    area: "Data quality",
    traditional: "Abbreviations and skipped fields depend on operator workload.",
    ai: "Confidence scoring flags low-certainty fields for human confirmation.",
  },
  {
    area: "Time to dispatch",
    traditional: "Typing competes with listening; details are captured after the fact.",
    ai: "Structured incident record is ready as the call ends.",
  },
  {
    area: "Auditability",
    traditional: "Final record only; the reasoning behind edits is rarely stored.",
    ai: "Transcript, extraction and every officer edit are logged as an audit trail.",
  },
  {
    area: "Reporting",
    traditional: "Analysts export CSVs and rebuild reports by hand.",
    ai: "Daily, weekly and monthly summaries generate from verified activity logs.",
  },
  {
    area: "Rollout cost",
    traditional: "Long procurement and on-premise infrastructure.",
    ai: "Browser-based, layered on top of existing dispatch workflows.",
  },
];

function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to dispatch
      </Link>

      <article>
        <header className="mb-8">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
            Guide
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {TITLE}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{DESCRIPTION}</p>
        </header>

        <section className="mb-10">
          <h2 className="font-display text-xl font-semibold">What traditional CAD does well</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Traditional computer-aided dispatch is the backbone of emergency response: unit status,
            recommendations, geospatial mapping and records integration. Those strengths are not in
            question. The bottleneck is the human interface — a dispatcher translating a live,
            emotional conversation into dozens of typed fields while triaging the response.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="font-display text-xl font-semibold">Where AI changes the workflow</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            AI-enhanced dispatch does not replace CAD; it removes the typing layer. Ambient voice
            capture listens, transcribes and proposes structured values — location, category,
            hazards, casualties, vehicle details — which the dispatcher confirms with a glance
            rather than a keyboard.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Clock, title: "Faster intake", body: "No form-filling during the call." },
              { icon: Cpu, title: "Cleaner data", body: "Confidence-scored extraction per field." },
              { icon: ShieldCheck, title: "Defensible records", body: "Transcript plus edit trail." },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl"
              >
                <c.icon className="h-4 w-4 text-primary" />
                <h3 className="mt-3 font-display text-sm font-semibold">{c.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="font-display text-xl font-semibold">Side-by-side comparison</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.05] text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="p-3">Area</th>
                  <th className="p-3">Traditional CAD</th>
                  <th className="p-3">AI-enhanced CAD</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.area} className="border-t border-white/10 align-top">
                    <th scope="row" className="p-3 font-semibold text-foreground">
                      {row.area}
                    </th>
                    <td className="p-3 text-muted-foreground">{row.traditional}</td>
                    <td className="p-3 text-muted-foreground">{row.ai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="font-display text-xl font-semibold">
            How to evaluate an AI dispatch layer
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong className="text-foreground">Human-in-the-loop by default.</strong> Every
              extracted field should be reviewable and editable before a record is finalised.
            </li>
            <li>
              <strong className="text-foreground">Department-specific schemas.</strong> Police, fire
              and health incidents need different fields and different documents.
            </li>
            <li>
              <strong className="text-foreground">Audit logging.</strong> Who recorded, who edited,
              who exported — with timestamps.
            </li>
            <li>
              <strong className="text-foreground">Role-based access.</strong> Analytics and exports
              restricted by clearance level.
            </li>
            <li>
              <strong className="text-foreground">Offline resilience.</strong> Intake must survive
              connectivity loss and sync afterwards.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Bottom line</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Traditional CAD tells you where your units are. AI-enhanced dispatch makes sure the
            incident behind that call is captured completely, consistently and defensibly — without
            a single form.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <ClipboardList className="h-4 w-4 text-primary" />
            <Link to="/" className="text-sm font-semibold text-primary hover:underline">
              Try the live dispatch terminal
            </Link>
          </div>
        </section>
      </article>
    </div>
  );
}
