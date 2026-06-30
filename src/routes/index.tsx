import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Mic, Sparkles, ShieldCheck, Camera, ScanLine, FileSignature,
  FileText, CheckCircle2, Circle, MapPin, AlertTriangle, User, MessageSquareText,
  Waves, Eraser, Download, ArrowRight, ImagePlus, X, Pin, Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zero-Form AVA — Ambient Voice App" },
      { name: "description", content: "Eliminate forms forever. Ambient voice, vision and signature — generating live job cards in real time." },
      { property: "og:title", content: "Zero-Form AVA" },
      { property: "og:description", content: "The end of form-filling." },
    ],
  }),
  component: Index,
});

/* ============== SHARED STATE ============== */
type Extracted = {
  name?: string;
  classification?: string;
  urgency?: string;
  location?: string;
  transcript: string;
};

const FULL_TRANSCRIPT =
  "Hi, this is Daniel Okafor. There is an active ceiling leak dripping water near my electrical fixtures at 14 Marina Drive, apartment 7B. It's urgent — water is pooling on the kitchen counter and I'm worried about a short circuit.";

const EXTRACTION_STEPS: { key: keyof Omit<Extracted, "transcript">; at: number; value: string }[] = [
  { key: "name", at: 22, value: "Daniel Okafor" },
  { key: "classification", at: 60, value: "Plumbing · water ingress + electrical risk" },
  { key: "location", at: 130, value: "14 Marina Drive, Apt 7B" },
  { key: "urgency", at: 170, value: "High — dispatch within 2h" },
];

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal, .reveal-up");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ============== ROOT ============== */
function Index() {
  useReveal();

  const [auto, setAuto] = useState(false);
  const [extracted, setExtracted] = useState<Extracted>({ transcript: "" });
  const [pins, setPins] = useState<{ x: number; y: number; label: string }[]>([]);
  const [thumbnails, setThumbnails] = useState<{ id: string; label: string; src: string }[]>([]);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [voicePrintHash, setVoicePrintHash] = useState<string | null>(null);

  // Drive the simulated extraction when "auto" is on
  useEffect(() => {
    if (!auto) {
      setExtracted({ transcript: "" });
      return;
    }
    let i = 0;
    const stepMs = 45;
    const interval = setInterval(() => {
      i += 1;
      setExtracted((prev) => {
        const next: Extracted = { ...prev, transcript: FULL_TRANSCRIPT.slice(0, i) };
        for (const s of EXTRACTION_STEPS) {
          if (i >= s.at && !next[s.key]) next[s.key] = s.value;
        }
        return next;
      });
      if (i >= FULL_TRANSCRIPT.length) clearInterval(interval);
    }, stepMs);
    return () => clearInterval(interval);
  }, [auto]);

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Nav />
      <Hero auto={auto} setAuto={setAuto} transcript={extracted.transcript} />
      <Checklist auto={auto} setAuto={setAuto} extracted={extracted} />
      <Evidence
        pins={pins}
        setPins={setPins}
        thumbnails={thumbnails}
        setThumbnails={setThumbnails}
      />
      <Signature
        onSignature={setSignatureData}
        onVoicePrint={setVoicePrintHash}
      />
      <JobCard
        extracted={extracted}
        pins={pins}
        signatureData={signatureData}
        voicePrintHash={voicePrintHash}
        thumbnails={thumbnails}
      />
      <Footer />
    </main>
  );
}

/* ============== NAV ============== */
function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative h-8 w-8 rounded-lg glass grid place-items-center shrink-0">
            <div className="h-2 w-2 rounded-full bg-primary glow-emerald" />
          </div>
          <span className="font-display font-bold tracking-tight truncate">
            Zero-Form <span className="text-primary">AVA</span>
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#capture" className="hover:text-foreground transition">Capture</a>
          <a href="#checklist" className="hover:text-foreground transition">Checklist</a>
          <a href="#evidence" className="hover:text-foreground transition">Evidence</a>
          <a href="#consent" className="hover:text-foreground transition">Consent</a>
          <a href="#document" className="hover:text-foreground transition">Document</a>
        </nav>
        <button className="text-xs font-medium px-4 py-2 rounded-full glass hover:bg-white/5 transition shrink-0">
          Request demo <ArrowRight className="inline h-3 w-3 ml-1" />
        </button>
      </div>
    </header>
  );
}

/* ============== HERO ============== */
function Hero({
  auto, setAuto, transcript,
}: { auto: boolean; setAuto: (v: boolean) => void; transcript: string }) {
  const [localListening, setLocalListening] = useState(false);
  const active = auto || localListening;

  const bars = useMemo(() => Array.from({ length: 64 }, (_, i) => i), []);

  const displayed = auto
    ? transcript
    : localListening
      ? FULL_TRANSCRIPT.slice(0, Math.min(FULL_TRANSCRIPT.length, Math.floor(Date.now() / 50) % FULL_TRANSCRIPT.length))
      : "";

  return (
    <section id="capture" className="relative pt-32 pb-24 md:pt-44 md:pb-32 grid-bg">
      <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 relative">
        <div className="text-center max-w-3xl mx-auto">
          <div className="reveal-up inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-muted-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Ambient Voice App · v1.0
          </div>
          <h1 className="reveal-up text-4xl sm:text-5xl md:text-7xl font-display font-extrabold leading-[1.02] tracking-tight">
            The end of <span className="text-gradient">forms</span>.<br/>
            The start of <span className="text-primary">conversation</span>.
          </h1>
          <p className="reveal-up mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
            Zero-Form AVA listens, sees and signs — turning ambient speech into
            structured job cards in real time. Tap the sphere. Just talk.
          </p>
        </div>

        {/* Orb */}
        <div className="mt-14 md:mt-20 flex flex-col items-center">
          <button
            onClick={() => { setLocalListening((v) => !v); if (!localListening) setAuto(true); else setAuto(false); }}
            aria-label="Toggle voice capture"
            className="relative h-56 w-56 md:h-72 md:w-72 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
          >
            {active && (
              <>
                <span className="absolute inset-0 rounded-full border border-primary/40 animate-ring-pulse" />
                <span className="absolute inset-0 rounded-full border border-secondary/30 animate-ring-pulse" style={{ animationDelay: "0.6s" }} />
                <span className="absolute inset-0 rounded-full border border-primary/20 animate-ring-pulse" style={{ animationDelay: "1.2s" }} />
                <span className="absolute -inset-8 rounded-full opacity-60 blur-2xl pointer-events-none"
                  style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--color-primary) 50%, transparent), transparent 70%)" }} />
              </>
            )}
            <div
              className={`relative h-full w-full rounded-full glass grid place-items-center overflow-hidden ${
                active ? "animate-orb-listen glow-emerald" : "animate-orb-pulse glow-emerald"
              }`}
            >
              {/* aurora interior */}
              <div
                className="absolute inset-2 rounded-full opacity-90"
                style={{
                  background:
                    "conic-gradient(from 180deg at 50% 50%, color-mix(in oklab, var(--color-primary) 45%, transparent), color-mix(in oklab, var(--color-secondary) 40%, transparent), color-mix(in oklab, var(--color-primary) 45%, transparent))",
                  filter: "blur(24px)",
                }}
              />
              {/* glass dome */}
              <div className="absolute inset-6 rounded-full bg-background/40 backdrop-blur-2xl border border-white/15"
                   style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -20px 40px rgba(0,0,0,0.4)" }} />
              {/* specular highlight */}
              <div className="absolute top-6 left-10 right-10 h-10 rounded-full opacity-50"
                   style={{ background: "radial-gradient(ellipse at center, rgba(255,255,255,0.65), transparent 70%)", filter: "blur(8px)" }} />
              <Mic className={`relative h-14 w-14 md:h-16 md:w-16 ${active ? "text-primary" : "text-foreground/80"}`} />
            </div>
          </button>

          <div className="mt-8 text-sm">
            {active ? (
              <span className="inline-flex items-center gap-2 text-primary">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Listening · streaming to AVA
              </span>
            ) : (
              <span className="text-muted-foreground">Tap the sphere to start a session</span>
            )}
          </div>

          {/* Waveform under orb */}
          <div className="mt-8 w-full max-w-2xl px-4">
            <div className="flex items-center justify-center gap-[3px] h-20">
              {bars.map((i) => (
                <span
                  key={i}
                  className="w-[3px] sm:w-1 rounded-full"
                  style={{
                    height: active ? `${15 + Math.abs(Math.sin(i * 0.7)) * 80}%` : "10%",
                    background: "linear-gradient(180deg, var(--color-secondary), var(--color-primary))",
                    animation: active
                      ? `waveform ${0.5 + (i % 9) * 0.07}s ease-in-out ${i * 0.025}s infinite`
                      : "none",
                    opacity: active ? 1 : 0.3,
                    boxShadow: active ? "0 0 8px color-mix(in oklab, var(--color-primary) 50%, transparent)" : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Transcription */}
          <div className="mt-6 w-full max-w-2xl min-h-28 glass rounded-2xl px-5 py-4 text-sm leading-relaxed">
            {displayed ? (
              <span className="text-foreground/90">
                {displayed}
                <span className="inline-block w-1.5 h-4 align-[-2px] ml-1 bg-primary animate-pulse" />
              </span>
            ) : (
              <span className="text-muted-foreground italic">Your live transcript will appear here…</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============== CONFIDENCE CHECKLIST ============== */
function Checklist({
  auto, setAuto, extracted,
}: { auto: boolean; setAuto: (v: boolean) => void; extracted: Extracted }) {
  const items: { key: keyof Omit<Extracted, "transcript">; icon: typeof User; label: string }[] = [
    { key: "name", icon: User, label: "Customer Name" },
    { key: "classification", icon: MessageSquareText, label: "Issue Classification" },
    { key: "urgency", icon: AlertTriangle, label: "Urgency Level" },
    { key: "location", icon: MapPin, label: "Location" },
  ];

  return (
    <section id="checklist" className="py-24 md:py-32 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] items-end gap-6 mb-12">
          <div className="max-w-2xl min-w-0">
            <p className="reveal-up text-xs uppercase tracking-[0.25em] text-primary mb-3">Live confidence</p>
            <h2 className="reveal-up text-3xl md:text-5xl font-display font-bold leading-tight">
              Parameters fill themselves<br/>as you speak.
            </h2>
            <p className="reveal-up mt-4 text-muted-foreground">
              AVA extracts entities in real time and lights each tile up as confidence rises.
              No fields. No typing. No friction.
            </p>
          </div>

          {/* Auto toggle */}
          <div className="reveal-up flex items-center gap-3 glass rounded-full pl-4 pr-1 py-1 shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <Zap className={`h-3.5 w-3.5 ${auto ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-muted-foreground">Demo automation</span>
            </div>
            <button
              onClick={() => setAuto(!auto)}
              role="switch"
              aria-checked={auto}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                auto ? "bg-primary/30 glow-emerald" : "bg-white/5"
              }`}
            >
              <span className={`inline-block h-6 w-6 rounded-full transition-transform ${
                auto ? "translate-x-9 bg-primary" : "translate-x-1 bg-muted-foreground/60"
              }`} />
              <span className="sr-only">Toggle automation</span>
            </button>
            <span className={`text-xs font-medium px-2 ${auto ? "text-primary" : "text-muted-foreground"}`}>
              {auto ? "ACTIVE" : "IDLE"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((it, i) => (
            <ChecklistTile
              key={it.key}
              index={i}
              icon={it.icon}
              label={it.label}
              value={extracted[it.key]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ChecklistTile({
  icon: Icon, label, value, index,
}: { icon: typeof User; label: string; value?: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const active = Boolean(value);

  return (
    <div
      ref={ref}
      className={`reveal group relative rounded-2xl p-6 md:p-7 glass overflow-hidden transition-all duration-700`}
      style={{
        transitionDelay: `${index * 120}ms`,
        borderColor: active
          ? "color-mix(in oklab, var(--color-primary) 60%, transparent)"
          : "oklch(0.24 0.025 250)",
        boxShadow: active
          ? "0 0 0 1px color-mix(in oklab, var(--color-primary) 40%, transparent), 0 0 40px -10px color-mix(in oklab, var(--color-primary) 55%, transparent)"
          : "none",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-10 w-10 rounded-xl grid place-items-center border transition-all duration-700 shrink-0 ${
            active ? "bg-primary/15 border-primary/40 text-primary" : "bg-white/[0.03] border-white/10 text-muted-foreground"
          }`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
            <div className={`mt-1 font-display font-semibold text-base sm:text-lg truncate transition-colors duration-700 ${
              active ? "text-foreground" : "text-muted-foreground/60"
            }`}>
              {active ? value : "Awaiting voice…"}
            </div>
          </div>
        </div>
        {active ? (
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 animate-in" style={{ filter: "drop-shadow(0 0 8px var(--color-primary))" }} />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground/30 shrink-0" />
        )}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-widest mb-2">
          <span className="text-muted-foreground">Confidence</span>
          <span className={active ? "text-primary" : "text-muted-foreground/60"}>{active ? "96%" : "—"}</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-[1400ms] ease-out"
            style={{
              width: active ? "96%" : "0%",
              background: "linear-gradient(90deg, var(--color-secondary), var(--color-primary))",
              boxShadow: active ? "0 0 18px color-mix(in oklab, var(--color-primary) 60%, transparent)" : "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ============== EVIDENCE CAPTURE ============== */
function Evidence({
  pins, setPins, thumbnails, setThumbnails,
}: {
  pins: { x: number; y: number; label: string }[];
  setPins: React.Dispatch<React.SetStateAction<{ x: number; y: number; label: string }[]>>;
  thumbnails: { id: string; label: string; src: string }[];
  setThumbnails: React.Dispatch<React.SetStateAction<{ id: string; label: string; src: string }[]>>;
}) {
  return (
    <section id="evidence" className="py-24 md:py-32 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <p className="reveal-up text-xs uppercase tracking-[0.25em] text-secondary mb-3">Evidence capture</p>
          <h2 className="reveal-up text-3xl md:text-5xl font-display font-bold leading-tight">
            See what the user sees.<br/>Scan, detect, pin.
          </h2>
          <p className="reveal-up mt-4 text-muted-foreground">
            OCR an ID in seconds, drop damage pins on a schematic — every capture creates an evidence thumbnail.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CameraFeed onCapture={(t) => setThumbnails((arr) => [t, ...arr].slice(0, 8))} />
          <PinSchematic
            pins={pins}
            setPins={setPins}
            onCapture={(t) => setThumbnails((arr) => [t, ...arr].slice(0, 8))}
          />
        </div>

        {/* Thumbnails */}
        <div className="mt-8">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Evidence vault</div>
          <div className="flex flex-wrap gap-3">
            {thumbnails.length === 0 && (
              <div className="text-xs text-muted-foreground/60 italic">No evidence captured yet — scan an ID or drop a pin.</div>
            )}
            {thumbnails.map((t) => (
              <div key={t.id} className="reveal-up glass rounded-xl p-2 w-32 group">
                <div className="aspect-square rounded-lg overflow-hidden bg-black/40 border border-white/10">
                  <img src={t.src} alt={t.label} className="w-full h-full object-cover" />
                </div>
                <div className="mt-1.5 text-[10px] text-muted-foreground truncate px-1">{t.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CameraFeed({ onCapture }: { onCapture: (t: { id: string; label: string; src: string }) => void }) {
  const targetRef = useRef<HTMLDivElement>(null);

  const capture = () => {
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'>
        <defs>
          <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
            <stop offset='0' stop-color='#06b6d4' stop-opacity='0.35'/>
            <stop offset='1' stop-color='#10b981' stop-opacity='0.35'/>
          </linearGradient>
        </defs>
        <rect width='200' height='150' fill='#0b1220'/>
        <rect x='10' y='10' width='180' height='130' rx='8' fill='url(%23g)' stroke='%2310b981' stroke-width='1.5'/>
        <circle cx='40' cy='55' r='18' fill='%23ffffff' opacity='0.25'/>
        <rect x='70' y='42' width='110' height='6' rx='2' fill='%23ffffff' opacity='0.6'/>
        <rect x='70' y='56' width='90' height='5' rx='2' fill='%23ffffff' opacity='0.45'/>
        <rect x='70' y='68' width='100' height='5' rx='2' fill='%23ffffff' opacity='0.35'/>
        <rect x='20' y='100' width='60' height='25' rx='4' fill='%2310b981' opacity='0.7'/>
        <text x='28' y='117' font-family='monospace' font-size='10' fill='white'>ID-VERIFIED</text>
      </svg>`.replace(/\n/g, "").replace(/#/g, "%23");
    onCapture({ id: crypto.randomUUID(), label: `ID Capture · ${new Date().toLocaleTimeString()}`, src: `data:image/svg+xml;utf8,${svg}` });
  };

  return (
    <div className="reveal relative rounded-2xl glass p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Camera className="h-4 w-4 text-secondary" /> Camera feed · OCR
        </div>
        <span className="text-[10px] text-primary inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> LIVE
        </span>
      </div>

      <div ref={targetRef} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10"
        style={{
          background:
            "radial-gradient(120% 80% at 30% 20%, color-mix(in oklab, var(--color-secondary) 18%, transparent), transparent 55%), linear-gradient(135deg, oklch(0.22 0.03 255), oklch(0.16 0.02 250))",
        }}
      >
        {/* mock id card */}
        <div className="absolute inset-[12%] rounded-lg bg-white/[0.04] border border-white/15 backdrop-blur-sm p-3 sm:p-4 grid grid-cols-[60px_1fr] sm:grid-cols-[80px_1fr] gap-3 sm:gap-4 items-center">
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-md bg-gradient-to-br from-primary/40 to-secondary/40 border border-white/20" />
          <div className="space-y-1.5">
            <div className="h-2 w-2/3 rounded bg-white/20" />
            <div className="h-2 w-1/2 rounded bg-white/15" />
            <div className="h-2 w-3/4 rounded bg-white/10" />
            <div className="mt-2 h-1.5 w-1/3 rounded bg-primary/60" />
          </div>
        </div>

        {/* OCR target box (pulsing neon green) */}
        <div className="absolute left-[8%] right-[8%] top-[10%] bottom-[10%] rounded-lg pointer-events-none"
          style={{
            border: "2px solid var(--color-primary)",
            boxShadow: "0 0 24px color-mix(in oklab, var(--color-primary) 70%, transparent), inset 0 0 18px color-mix(in oklab, var(--color-primary) 40%, transparent)",
            animation: "orb-pulse 2.4s ease-in-out infinite",
          }}
        />

        {/* scan line */}
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line"
             style={{ boxShadow: "0 0 24px var(--color-primary)" }} />

        {/* corners */}
        {[
          "top-3 left-3 border-l-2 border-t-2",
          "top-3 right-3 border-r-2 border-t-2",
          "bottom-3 left-3 border-l-2 border-b-2",
          "bottom-3 right-3 border-r-2 border-b-2",
        ].map((c) => (
          <span key={c} className={`absolute h-6 w-6 border-primary ${c}`} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <Field label="Full Name" value="Daniel Okafor" />
        <Field label="ID Number" value="A1 442 998 21" />
        <Field label="Date of Birth" value="1991-04-12" />
        <Field label="Expiry" value="2029-11-30" />
      </div>

      <button
        onClick={capture}
        className="mt-4 w-full text-xs font-medium px-4 py-2.5 rounded-xl glass hover:bg-primary/10 transition inline-flex items-center justify-center gap-2 text-primary"
      >
        <ImagePlus className="h-4 w-4" /> Capture frame
      </button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-sm text-foreground mt-0.5 truncate">{value}</div>
    </div>
  );
}

function PinSchematic({
  pins, setPins, onCapture,
}: {
  pins: { x: number; y: number; label: string }[];
  setPins: React.Dispatch<React.SetStateAction<{ x: number; y: number; label: string }[]>>;
  onCapture: (t: { id: string; label: string; src: string }) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  const drop = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = boxRef.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    const label = `Damage point ${pins.length + 1}`;
    setPins((p) => [...p, { x, y, label }]);

    // Build thumbnail of the schematic+pins
    const pinSvg = [...pins, { x, y, label }]
      .map((p) => `<circle cx='${p.x.toFixed(1)}%' cy='${p.y.toFixed(1)}%' r='4' fill='%23ef4444'/>`)
      .join("");
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'>
        <rect width='200' height='150' fill='%230b1220'/>
        <path d='M30 110 L100 50 L170 110 Z' fill='none' stroke='%2306b6d4' stroke-width='1.5'/>
        <rect x='40' y='110' width='120' height='30' fill='none' stroke='%2306b6d4' stroke-width='1.5'/>
        ${pinSvg}
      </svg>`.replace(/\n/g, "").replace(/#/g, "%23");
    onCapture({
      id: crypto.randomUUID(),
      label: `Pin map · ${pins.length + 1} marker${pins.length ? "s" : ""}`,
      src: `data:image/svg+xml;utf8,${svg}`,
    });
  };

  const removePin = (idx: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setPins((p) => p.filter((_, i) => i !== idx));
  };

  return (
    <div className="reveal relative rounded-2xl glass p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Pin className="h-4 w-4 text-destructive" /> Damage pins · tap to mark
        </div>
        <button
          onClick={() => setPins([])}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
        >
          <Eraser className="h-3.5 w-3.5" /> Clear
        </button>
      </div>

      <div
        ref={boxRef}
        onClick={drop}
        className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 cursor-crosshair select-none"
        style={{
          background:
            "radial-gradient(80% 60% at 70% 30%, color-mix(in oklab, var(--color-primary) 12%, transparent), transparent 60%), linear-gradient(160deg, oklch(0.24 0.03 250), oklch(0.14 0.02 250))",
        }}
      >
        {/* schematic: house outline */}
        <svg viewBox="0 0 200 150" className="absolute inset-0 w-full h-full opacity-70" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="200" height="150" fill="url(#grid)"/>
          <path d="M30 110 L100 35 L170 110" fill="none" stroke="currentColor" className="text-secondary" strokeWidth="1" />
          <rect x="40" y="110" width="120" height="32" fill="none" stroke="currentColor" className="text-secondary" strokeWidth="1" />
          <rect x="55" y="120" width="20" height="22" fill="none" stroke="currentColor" className="text-secondary/70" strokeWidth="0.8" />
          <rect x="90" y="120" width="22" height="14" fill="none" stroke="currentColor" className="text-secondary/70" strokeWidth="0.8" />
          <rect x="130" y="120" width="20" height="14" fill="none" stroke="currentColor" className="text-secondary/70" strokeWidth="0.8" />
        </svg>

        {pins.map((p, i) => (
          <button
            key={i}
            onClick={removePin(i)}
            className="absolute -translate-x-1/2 -translate-y-1/2 group/pin"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            aria-label={`Remove ${p.label}`}
          >
            <span className="absolute inset-0 rounded-full bg-destructive/40 animate-ring-pulse" />
            <span className="relative block h-4 w-4 rounded-full bg-destructive border border-white/80"
                  style={{ boxShadow: "0 0 18px var(--color-destructive)" }} />
            <span className="absolute left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded-md glass text-[10px] whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition">
              {p.label} <X className="inline h-2.5 w-2.5 ml-1" />
            </span>
          </button>
        ))}

        {pins.length === 0 && (
          <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground/70 tracking-widest uppercase pointer-events-none">
            Tap anywhere to drop a red pin
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {pins.map((p, i) => (
          <span key={i} className="text-[11px] px-2.5 py-1 rounded-full glass text-foreground/80">
            <span className="text-destructive mr-1.5">●</span>{p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============== SIGNATURE + CONSENT ============== */
function Signature({
  onSignature, onVoicePrint,
}: {
  onSignature: (dataUrl: string | null) => void;
  onVoicePrint: (hash: string | null) => void;
}) {
  return (
    <section id="consent" className="py-24 md:py-32 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <p className="reveal-up text-xs uppercase tracking-[0.25em] text-primary mb-3">Voice signature & consent</p>
          <h2 className="reveal-up text-3xl md:text-5xl font-display font-bold leading-tight">
            Sign with a stroke.<br/>Confirm with your voice.
          </h2>
          <p className="reveal-up mt-4 text-muted-foreground">
            Tamper-evident submission combining cryptographic signature and biometric voice consent.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SignaturePad onChange={onSignature} />
          <VoiceConsent onHash={onVoicePrint} />
        </div>
      </div>
    </section>
  );
}

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSig, setHasSig] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const resize = () => {
      const r = c.getBoundingClientRect();
      c.width = r.width * ratio;
      c.height = r.height * ratio;
      const ctx = c.getContext("2d")!;
      ctx.scale(ratio, ratio);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgb(16,185,129)";
      ctx.shadowColor = "rgba(16,185,129,0.6)";
      ctx.shadowBlur = 8;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e: React.PointerEvent) => {
    drawing.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasSig) setHasSig(true);
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const c = canvasRef.current!;
    onChange(c.toDataURL("image/png"));
  };
  const clear = () => {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setHasSig(false);
    onChange(null);
  };

  return (
    <div className="reveal rounded-2xl glass p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <FileSignature className="h-4 w-4 text-primary" /> Digital signature
        </div>
        <button onClick={clear} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <Eraser className="h-3.5 w-3.5" /> Clear
        </button>
      </div>
      <div className="relative h-56 rounded-xl border border-white/10 bg-black/30 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
          onPointerCancel={up}
        />
        {!hasSig && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <span className="text-xs text-muted-foreground/70 tracking-widest uppercase">Sign within the frame</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 border-t border-dashed border-white/15" />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">SHA-256 · timestamped · geotagged</span>
        <span className={`inline-flex items-center gap-1.5 ${hasSig ? "text-primary" : "text-muted-foreground"}`}>
          <ShieldCheck className="h-3.5 w-3.5" /> {hasSig ? "Captured" : "Awaiting"}
        </span>
      </div>
    </div>
  );
}

function makeHash(prefix: string) {
  const chars = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 56; i++) s += chars[Math.floor(Math.random() * 16)];
  return `${prefix}:${s}`;
}

function VoiceConsent({ onHash }: { onHash: (h: string | null) => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [hash, setHash] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  const stop = () => {
    setRecording(false);
    if (seconds > 0) {
      const h = makeHash("sha256");
      setHash(h);
      setVerified(true);
      onHash(h);
    }
  };

  const start = () => {
    setSeconds(0);
    setRecording(true);
    setVerified(false);
  };

  const bars = 60;
  return (
    <div className="reveal rounded-2xl glass p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Waves className="h-4 w-4 text-secondary" /> Voice consent
        </div>
        <span className="text-[10px] text-muted-foreground">{seconds.toString().padStart(2, "0")}s / 30s</span>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-5 h-56 flex flex-col justify-between">
        <div className="text-xs text-muted-foreground leading-relaxed">
          Please read aloud:&nbsp;
          <span className="text-foreground italic">"I authorize this submission."</span>
        </div>
        <div className="flex items-end justify-center gap-[3px] h-20">
          {Array.from({ length: bars }).map((_, i) => (
            <span
              key={i}
              className="w-1 rounded-full"
              style={{
                height: recording
                  ? `${20 + Math.abs(Math.sin(i * 0.7)) * 70}%`
                  : verified
                    ? `${30 + Math.abs(Math.sin(i * 0.5)) * 50}%`
                    : "12%",
                background: "linear-gradient(180deg, var(--color-secondary), var(--color-primary))",
                animation: recording ? `waveform ${0.6 + (i % 7) * 0.08}s ease-in-out ${i * 0.03}s infinite` : "none",
                opacity: recording ? 1 : verified ? 0.7 : 0.3,
                boxShadow: recording ? "0 0 8px color-mix(in oklab, var(--color-primary) 60%, transparent)" : "none",
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          onClick={recording ? stop : start}
          className={`text-xs font-medium px-4 py-2 rounded-full transition glass ${recording ? "glow-emerald text-primary" : "hover:bg-white/5"}`}
        >
          {recording ? "Stop & verify" : verified ? "Re-record" : "Record voice consent"}
        </button>
        <span className={`text-xs inline-flex items-center gap-1.5 ${verified ? "text-primary" : recording ? "text-primary" : "text-muted-foreground"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${recording ? "bg-primary animate-pulse" : verified ? "bg-primary" : "bg-muted-foreground/50"}`} />
          {recording ? "Capturing biometric" : verified ? "Voiceprint verified" : "Idle"}
        </span>
      </div>

      {hash && (
        <div className="mt-3 rounded-lg bg-primary/5 border border-primary/30 px-3 py-2.5 text-[11px] font-mono break-all leading-relaxed">
          <span className="text-primary">SHA-256 voiceprint:</span>{" "}
          <span className="text-foreground/80">{hash.slice(7, 39)}…{hash.slice(-12)}</span>
        </div>
      )}
    </div>
  );
}

/* ============== JOB CARD ============== */
function JobCard({
  extracted, pins, signatureData, voicePrintHash, thumbnails,
}: {
  extracted: Extracted;
  pins: { x: number; y: number; label: string }[];
  signatureData: string | null;
  voicePrintHash: string | null;
  thumbnails: { id: string; label: string; src: string }[];
}) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const exportPdf = () => {
    setDone(false);
    setExporting(true);
    setProgress(0);
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(id);
          setExporting(false);
          setDone(true);
          return 100;
        }
        return p + Math.random() * 8 + 2;
      });
    }, 120);
  };

  return (
    <section id="document" className="py-24 md:py-32 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <p className="reveal-up text-xs uppercase tracking-[0.25em] text-primary mb-3">Dynamic PDF document</p>
          <h2 className="reveal-up text-3xl md:text-5xl font-display font-bold leading-tight">
            A printable job card,<br/>written by your voice.
          </h2>
          <p className="reveal-up mt-4 text-muted-foreground">
            Every captured signal — voice, vision, signature — composes itself into a dispatchable document.
          </p>
        </div>

        <div className="reveal-up grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <Document
            extracted={extracted}
            pins={pins}
            signatureData={signatureData}
            voicePrintHash={voicePrintHash}
            thumbnails={thumbnails}
          />
          <aside className="space-y-4 self-start">
            <Pipeline
              extracted={extracted}
              signatureData={signatureData}
              voicePrintHash={voicePrintHash}
              pins={pins}
            />
            <div className="rounded-2xl glass p-6">
              <button
                onClick={exportPdf}
                disabled={exporting}
                className="w-full text-sm font-semibold px-4 py-3.5 rounded-xl glass glow-emerald text-primary inline-flex items-center justify-center gap-2 hover:bg-primary/10 transition disabled:opacity-70"
              >
                <Download className="h-4 w-4" />
                {exporting ? "Exporting…" : done ? "Export again" : "Export secure PDF"}
              </button>

              {(exporting || done) && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                    <span>{done ? "Document signed" : "Rendering & signing"}</span>
                    <span className={done ? "text-primary" : ""}>{Math.min(100, Math.round(progress))}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, progress)}%`,
                        background: "linear-gradient(90deg, var(--color-secondary), var(--color-primary))",
                        boxShadow: "0 0 18px color-mix(in oklab, var(--color-primary) 60%, transparent)",
                      }}
                    />
                  </div>
                  {done && (
                    <div className="mt-3 text-xs text-primary inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> AVA-2026-00471.pdf — ready
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Document({
  extracted, pins, signatureData, voicePrintHash, thumbnails,
}: {
  extracted: Extracted;
  pins: { x: number; y: number; label: string }[];
  signatureData: string | null;
  voicePrintHash: string | null;
  thumbnails: { id: string; label: string; src: string }[];
}) {
  const pinThumb = thumbnails.find((t) => t.label.startsWith("Pin map"));

  return (
    <div className="rounded-2xl bg-[oklch(0.98_0.005_240)] text-[oklch(0.18_0.02_250)] shadow-2xl overflow-hidden border border-white/5">
      <div className="px-6 sm:px-8 py-6 border-b border-black/10 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.3em] text-black/50">Job card</div>
          <div className="font-display font-bold text-xl sm:text-2xl truncate">AVA-2026-00471</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.3em] text-black/50">Status</div>
          <div className="inline-flex items-center gap-1.5 mt-1 text-sm font-semibold text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {extracted.urgency ? "Confirmed" : "Pending capture"}
          </div>
        </div>
      </div>

      <div className="px-6 sm:px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 text-sm border-b border-black/10">
        <DocRow label="Reporter" value={extracted.name ?? "—"} />
        <DocRow label="Contact" value="+44 7700 900 421" />
        <DocRow label="Location" value={extracted.location ?? "—"} />
        <DocRow label="Urgency" value={extracted.urgency ?? "—"} highlight={!!extracted.urgency} />
        <DocRow label="Category" value={extracted.classification ?? "—"} />
        <DocRow label="Date" value="30 Jun 2026 · 14:22" />
      </div>

      <div className="px-6 sm:px-8 py-5 border-b border-black/10">
        <div className="text-[10px] uppercase tracking-[0.3em] text-black/50 mb-2">Voice transcript</div>
        <p className="text-sm leading-relaxed text-black/80 italic">
          {extracted.transcript || "Awaiting voice capture…"}
        </p>
      </div>

      <div className="px-6 sm:px-8 py-5 grid grid-cols-1 md:grid-cols-[1fr_180px] gap-6 items-start border-b border-black/10">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-black/50 mb-2">Damage map · {pins.length} pin{pins.length === 1 ? "" : "s"}</div>
          <ul className="text-sm text-black/80 space-y-1">
            {pins.length === 0 && <li className="text-black/40 italic">No damage points pinned.</li>}
            {pins.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {p.label} <span className="text-black/40">· ({p.x.toFixed(0)}%, {p.y.toFixed(0)}%)</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-black/10 bg-black/[0.03] overflow-hidden aspect-[4/3]">
          {pinThumb ? (
            <img src={pinThumb.src} alt="Damage map" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-[10px] uppercase tracking-widest text-black/40">
              Pin map
            </div>
          )}
        </div>
      </div>

      <div className="px-6 sm:px-8 py-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-black/50 mb-2">Signature</div>
          {signatureData ? (
            <img src={signatureData} alt="Signature" className="h-14 w-auto max-w-full" />
          ) : (
            <svg viewBox="0 0 220 60" className="w-44 h-12 text-emerald-600">
              <path d="M5 45 Q 25 5, 50 40 T 100 35 Q 130 60, 160 20 T 215 35" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          )}
          <div className="text-xs text-black/60 mt-1">
            {extracted.name ?? "Pending"} · {voicePrintHash ? "voiceprint verified" : "biometric pending"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.3em] text-black/50 mb-2">Authorisation</div>
          <div className="font-display font-bold">AVA · System</div>
          <div className="text-xs text-black/60 font-mono break-all">
            {voicePrintHash ? `${voicePrintHash.slice(7, 19)}…` : "SHA-256 · pending"}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-[0.3em] text-black/50">{label}</div>
      <div className={`font-display font-semibold mt-0.5 truncate ${highlight ? "text-emerald-700" : "text-black"}`}>
        {value}
      </div>
    </div>
  );
}

function Pipeline({
  extracted, signatureData, voicePrintHash, pins,
}: {
  extracted: Extracted;
  signatureData: string | null;
  voicePrintHash: string | null;
  pins: { x: number; y: number; label: string }[];
}) {
  const steps = [
    { label: "Voice captured", done: extracted.transcript.length > 5 },
    { label: "Entities extracted", done: !!extracted.name && !!extracted.location },
    { label: "ID verified", done: !!extracted.name },
    { label: "Defects mapped", done: pins.length > 0 },
    { label: "Signature bound", done: !!signatureData },
    { label: "Voice consent verified", done: !!voicePrintHash },
  ];
  return (
    <div className="rounded-2xl glass p-6">
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-5 flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" /> Generation pipeline
      </div>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-3">
            <span className={`relative grid place-items-center h-6 w-6 rounded-full border ${
              s.done ? "bg-primary/15 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-muted-foreground/60"
            }`}>
              {s.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
              {i < steps.length - 1 && <span className={`absolute top-full h-4 w-px ${s.done ? "bg-primary/30" : "bg-white/10"}`} />}
            </span>
            <span className={`text-sm ${s.done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ============== FOOTER ============== */
function Footer() {
  return (
    <footer className="border-t border-white/5 py-10 mt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md glass grid place-items-center">
            <div className="h-1.5 w-1.5 rounded-full bg-primary glow-emerald" />
          </div>
          <span>Zero-Form AVA · Ambient Voice App</span>
        </div>
        <div>© 2026 · Crafted for a paperless future</div>
      </div>
    </footer>
  );
}
