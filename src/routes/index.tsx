import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Mic, Sparkles, ShieldCheck, Camera, ScanLine, FileSignature,
  FileText, CheckCircle2, MapPin, AlertTriangle, User, MessageSquareText,
  Waves, Eraser, Printer, ArrowRight,
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

function Index() {
  useReveal();
  return (
    <main className="min-h-screen overflow-x-hidden">
      <Nav />
      <Hero />
      <Checklist />
      <Vision />
      <Signature />
      <JobCard />
      <Footer />
    </main>
  );
}

function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative h-8 w-8 rounded-lg glass grid place-items-center">
            <div className="h-2 w-2 rounded-full bg-primary glow-emerald" />
          </div>
          <span className="font-display font-bold tracking-tight">Zero-Form <span className="text-primary">AVA</span></span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#capture" className="hover:text-foreground transition">Capture</a>
          <a href="#vision" className="hover:text-foreground transition">Vision</a>
          <a href="#consent" className="hover:text-foreground transition">Consent</a>
          <a href="#document" className="hover:text-foreground transition">Document</a>
        </nav>
        <button className="text-xs font-medium px-4 py-2 rounded-full glass hover:bg-white/5 transition">
          Request demo <ArrowRight className="inline h-3 w-3 ml-1" />
        </button>
      </div>
    </header>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const lines = useMemo(
    () => [
      "Hi, my name is Daniel Okafor…",
      "I'm reporting an urgent water leak…",
      "It's at 14 Marina Drive, apartment 7B…",
      "The kitchen ceiling is dripping heavily…",
    ],
    [],
  );

  useEffect(() => {
    if (!listening) return;
    let i = 0;
    setTranscript("");
    const id = setInterval(() => {
      setTranscript((t) => (t ? t + " " : "") + lines[i % lines.length]);
      i += 1;
      if (i >= lines.length) clearInterval(id);
    }, 1400);
    return () => clearInterval(id);
  }, [listening, lines]);

  return (
    <section className="relative pt-32 pb-24 md:pt-44 md:pb-32 grid-bg" id="capture">
      <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="text-center max-w-3xl mx-auto">
          <div className="reveal-up inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-muted-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Ambient Voice App · v1.0
          </div>
          <h1 className="reveal-up text-5xl md:text-7xl font-display font-extrabold leading-[1.02] tracking-tight">
            The end of <span className="text-gradient">forms</span>.<br/>
            The start of <span className="text-primary">conversation</span>.
          </h1>
          <p className="reveal-up mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Zero-Form AVA listens, sees and signs — turning ambient speech into
            structured job cards in real time. Tap the orb. Just talk.
          </p>
        </div>

        {/* Orb */}
        <div className="mt-16 md:mt-24 flex flex-col items-center">
          <button
            onClick={() => setListening((v) => !v)}
            aria-label="Toggle voice capture"
            className="relative h-56 w-56 md:h-72 md:w-72 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
          >
            {/* outer pulse rings */}
            {listening && (
              <>
                <span className="absolute inset-0 rounded-full border border-primary/40 animate-ring-pulse" />
                <span className="absolute inset-0 rounded-full border border-secondary/30 animate-ring-pulse" style={{ animationDelay: "0.6s" }} />
                <span className="absolute inset-0 rounded-full border border-primary/20 animate-ring-pulse" style={{ animationDelay: "1.2s" }} />
              </>
            )}
            <div
              className={`relative h-full w-full rounded-full glass grid place-items-center overflow-hidden ${
                listening ? "animate-orb-listen glow-emerald" : "animate-orb-pulse glow-emerald"
              }`}
            >
              <div
                className="absolute inset-3 rounded-full opacity-90"
                style={{
                  background:
                    "conic-gradient(from 180deg at 50% 50%, color-mix(in oklab, var(--color-primary) 40%, transparent), color-mix(in oklab, var(--color-secondary) 35%, transparent), color-mix(in oklab, var(--color-primary) 40%, transparent))",
                  filter: "blur(22px)",
                }}
              />
              <div className="absolute inset-8 rounded-full bg-background/40 backdrop-blur-2xl border border-white/10" />
              <Mic className={`relative h-14 w-14 md:h-16 md:w-16 ${listening ? "text-primary" : "text-foreground/80"}`} />
            </div>
          </button>
          <div className="mt-8 text-sm">
            {listening ? (
              <span className="inline-flex items-center gap-2 text-primary">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Listening · streaming to AVA
              </span>
            ) : (
              <span className="text-muted-foreground">Tap the orb to start a session</span>
            )}
          </div>

          <div className="mt-8 w-full max-w-2xl min-h-24 glass rounded-2xl px-5 py-4 text-sm leading-relaxed">
            {transcript ? (
              <span className="text-foreground/90">{transcript}<span className="inline-block w-1.5 h-4 align-[-2px] ml-1 bg-primary animate-pulse" /></span>
            ) : (
              <span className="text-muted-foreground italic">Your live transcript will appear here…</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- CONFIDENCE CHECKLIST ---------------- */
function Checklist() {
  const items = [
    { icon: User, label: "Name", value: "Daniel Okafor", confidence: 98 },
    { icon: AlertTriangle, label: "Urgency", value: "High · escalate", confidence: 94 },
    { icon: MessageSquareText, label: "Issue Description", value: "Water leak from kitchen ceiling", confidence: 91 },
    { icon: MapPin, label: "Location", value: "14 Marina Drive, Apt 7B", confidence: 96 },
  ];
  return (
    <section className="py-24 md:py-32 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl mb-14">
          <p className="reveal-up text-xs uppercase tracking-[0.25em] text-primary mb-3">Live confidence</p>
          <h2 className="reveal-up text-3xl md:text-5xl font-display font-bold leading-tight">
            Parameters fill themselves<br/>as you speak.
          </h2>
          <p className="reveal-up mt-4 text-muted-foreground">
            AVA extracts entities in real time and lights each tile up as confidence rises.
            No fields. No typing. No friction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((it, i) => (
            <ChecklistTile key={it.label} {...it} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ChecklistTile({
  icon: Icon, label, value, confidence, index,
}: { icon: typeof User; label: string; value: string; confidence: number; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTimeout(() => setActive(true), index * 280);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      className={`reveal group relative rounded-2xl p-6 md:p-7 glass transition-all duration-700 ${
        active ? "glow-emerald" : ""
      }`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl grid place-items-center border transition-colors duration-700 ${
            active ? "bg-primary/15 border-primary/40 text-primary" : "bg-white/[0.03] border-white/10 text-muted-foreground"
          }`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
            <div className={`mt-1 font-display font-semibold text-lg transition-colors duration-700 ${
              active ? "text-foreground" : "text-muted-foreground/60"
            }`}>
              {active ? value : "Awaiting voice…"}
            </div>
          </div>
        </div>
        <CheckCircle2 className={`h-5 w-5 transition-all duration-700 ${active ? "text-primary scale-100" : "text-muted-foreground/30 scale-90"}`} />
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-widest mb-2">
          <span className="text-muted-foreground">Confidence</span>
          <span className={active ? "text-primary" : "text-muted-foreground/60"}>{active ? `${confidence}%` : "—"}</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-[1400ms] ease-out"
            style={{
              width: active ? `${confidence}%` : "0%",
              background: "linear-gradient(90deg, var(--color-secondary), var(--color-primary))",
              boxShadow: active ? "0 0 18px color-mix(in oklab, var(--color-primary) 60%, transparent)" : "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------- VISION ---------------- */
function Vision() {
  return (
    <section id="vision" className="py-24 md:py-32 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl mb-14">
          <p className="reveal-up text-xs uppercase tracking-[0.25em] text-secondary mb-3">Live vision</p>
          <h2 className="reveal-up text-3xl md:text-5xl font-display font-bold leading-tight">
            See what the user sees.<br/>Scan, detect, pin.
          </h2>
          <p className="reveal-up mt-4 text-muted-foreground">
            OCR an ID in seconds, pinpoint defects on a live canvas — all alongside the voice stream.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <IdScanner />
          <DefectCanvas />
        </div>
      </div>
    </section>
  );
}

function IdScanner() {
  return (
    <div className="reveal relative rounded-2xl glass p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Camera className="h-4 w-4 text-secondary" /> ID Capture · OCR
        </div>
        <span className="text-[10px] text-primary inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> LIVE
        </span>
      </div>

      <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10"
        style={{
          background:
            "radial-gradient(120% 80% at 30% 20%, color-mix(in oklab, var(--color-secondary) 18%, transparent), transparent 55%), linear-gradient(135deg, oklch(0.22 0.03 255), oklch(0.16 0.02 250))",
        }}
      >
        {/* mock id card */}
        <div className="absolute inset-[12%] rounded-lg bg-white/[0.04] border border-white/15 backdrop-blur-sm p-4 grid grid-cols-[80px_1fr] gap-4 items-center">
          <div className="h-20 w-20 rounded-md bg-gradient-to-br from-primary/40 to-secondary/40 border border-white/20" />
          <div className="space-y-1.5">
            <div className="h-2 w-2/3 rounded bg-white/20" />
            <div className="h-2 w-1/2 rounded bg-white/15" />
            <div className="h-2 w-3/4 rounded bg-white/10" />
            <div className="mt-2 h-1.5 w-1/3 rounded bg-primary/60" />
          </div>
        </div>

        {/* scan line */}
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line"
             style={{ boxShadow: "0 0 24px var(--color-primary)" }} />

        {/* corner brackets */}
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
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-sm text-foreground mt-0.5">{value}</div>
    </div>
  );
}

function DefectCanvas() {
  const pins = [
    { x: 32, y: 42, label: "Crack · 18cm" },
    { x: 64, y: 28, label: "Water stain" },
    { x: 52, y: 70, label: "Mold growth" },
  ];
  return (
    <div className="reveal relative rounded-2xl glass p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <ScanLine className="h-4 w-4 text-primary" /> Defect Pinpointing
        </div>
        <span className="text-[10px] text-secondary inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" /> AI
        </span>
      </div>

      <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10"
        style={{
          background:
            "radial-gradient(80% 60% at 70% 30%, color-mix(in oklab, var(--color-primary) 14%, transparent), transparent 60%), linear-gradient(160deg, oklch(0.24 0.03 250), oklch(0.14 0.02 250))",
        }}
      >
        {/* simulated wall surface */}
        <div className="absolute inset-0 opacity-40 grid-bg" />
        {pins.map((p, i) => (
          <div key={i}
               className="absolute -translate-x-1/2 -translate-y-1/2"
               style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-primary/40 animate-ring-pulse" />
              <span className="relative block h-3.5 w-3.5 rounded-full bg-primary glow-emerald" />
            </div>
            <div className="mt-2 px-2 py-1 rounded-md glass text-[10px] whitespace-nowrap">
              {p.label}
            </div>
          </div>
        ))}
        {/* bounding box */}
        <div className="absolute left-[22%] top-[20%] w-[40%] h-[35%] rounded-md border-2 border-secondary/60"
             style={{ boxShadow: "0 0 24px color-mix(in oklab, var(--color-secondary) 60%, transparent) inset" }} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {pins.map((p) => (
          <span key={p.label} className="text-[11px] px-2.5 py-1 rounded-full glass text-foreground/80">
            <span className="text-primary mr-1.5">●</span>{p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- SIGNATURE & CONSENT ---------------- */
function Signature() {
  return (
    <section id="consent" className="py-24 md:py-32 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl mb-14">
          <p className="reveal-up text-xs uppercase tracking-[0.25em] text-primary mb-3">Voice signature</p>
          <h2 className="reveal-up text-3xl md:text-5xl font-display font-bold leading-tight">
            Sign with a stroke.<br/>Confirm with your voice.
          </h2>
          <p className="reveal-up mt-4 text-muted-foreground">
            Tamper-evident submission combining cryptographic signature and biometric voice consent.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SignaturePad />
          <VoiceConsent />
        </div>
      </div>
    </section>
  );
}

function SignaturePad() {
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
  const up = () => { drawing.current = false; };
  const clear = () => {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setHasSig(false);
  };

  return (
    <div className="reveal rounded-2xl glass p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <FileSignature className="h-4 w-4 text-primary" /> Digital Signature
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

function VoiceConsent() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  const bars = 48;
  return (
    <div className="reveal rounded-2xl glass p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Waves className="h-4 w-4 text-secondary" /> Voice Consent
        </div>
        <span className="text-[10px] text-muted-foreground">{seconds.toString().padStart(2, "0")}s / 30s</span>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-5 h-56 flex flex-col justify-between">
        <div className="text-xs text-muted-foreground leading-relaxed">
          “I, <span className="text-foreground">Daniel Okafor</span>, confirm the details submitted to
          Zero-Form AVA are true and consent to their processing.”
        </div>
        <div className="flex items-end justify-center gap-[3px] h-20">
          {Array.from({ length: bars }).map((_, i) => (
            <span
              key={i}
              className="w-1 rounded-full"
              style={{
                height: recording ? `${20 + Math.abs(Math.sin(i * 0.7)) * 70}%` : "12%",
                background: "linear-gradient(180deg, var(--color-secondary), var(--color-primary))",
                animation: recording ? `waveform ${0.6 + (i % 7) * 0.08}s ease-in-out ${i * 0.03}s infinite` : "none",
                opacity: recording ? 1 : 0.35,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => { setRecording((v) => !v); if (!recording) setSeconds(0); }}
          className={`text-xs font-medium px-4 py-2 rounded-full transition glass ${recording ? "glow-emerald text-primary" : "hover:bg-white/5"}`}
        >
          {recording ? "Stop recording" : "Record voice consent"}
        </button>
        <span className={`text-xs inline-flex items-center gap-1.5 ${recording ? "text-primary" : "text-muted-foreground"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${recording ? "bg-primary animate-pulse" : "bg-muted-foreground/50"}`} />
          {recording ? "Capturing biometric" : "Idle"}
        </span>
      </div>
    </div>
  );
}

/* ---------------- LIVE JOB CARD ---------------- */
function JobCard() {
  return (
    <section id="document" className="py-24 md:py-32 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl mb-14">
          <p className="reveal-up text-xs uppercase tracking-[0.25em] text-primary mb-3">Live document</p>
          <h2 className="reveal-up text-3xl md:text-5xl font-display font-bold leading-tight">
            A printable job card,<br/>written by your voice.
          </h2>
          <p className="reveal-up mt-4 text-muted-foreground">
            Watch the document compose itself — clean, professional, ready to dispatch.
          </p>
        </div>

        <div className="reveal-up grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <Document />
          <Pipeline />
        </div>
      </div>
    </section>
  );
}

function Document() {
  return (
    <div className="rounded-2xl bg-[oklch(0.98_0.005_240)] text-[oklch(0.18_0.02_250)] shadow-2xl overflow-hidden border border-white/5">
      <div className="px-8 py-6 border-b border-black/10 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-black/50">Job Card</div>
          <div className="font-display font-bold text-2xl">AVA-2026-00471</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.3em] text-black/50">Status</div>
          <div className="inline-flex items-center gap-1.5 mt-1 text-sm font-semibold text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Confirmed
          </div>
        </div>
      </div>

      <div className="px-8 py-7 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 text-sm">
        <DocRow label="Reporter" value="Daniel Okafor" />
        <DocRow label="Contact" value="+44 7700 900 421" />
        <DocRow label="Location" value="14 Marina Drive, Apt 7B, London" />
        <DocRow label="Urgency" value="High — dispatch within 2h" highlight />
        <DocRow label="Category" value="Plumbing · water ingress" />
        <DocRow label="Date" value="30 Jun 2026 · 14:22" />
      </div>

      <div className="px-8 pb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-black/50 mb-2">Description</div>
        <p className="text-sm leading-relaxed text-black/80">
          Reporter describes heavy water dripping from kitchen ceiling onto worktop.
          Source suspected from upstairs unit. Three defects pinpointed via vision capture
          (crack 18cm, water stain, mold growth). ID verified via OCR.
        </p>
      </div>

      <div className="px-8 pb-8 grid grid-cols-2 gap-8 items-end border-t border-black/10 pt-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-black/50 mb-2">Signature</div>
          <svg viewBox="0 0 220 60" className="w-44 h-12 text-emerald-600">
            <path d="M5 45 Q 25 5, 50 40 T 100 35 Q 130 60, 160 20 T 215 35" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <div className="text-xs text-black/60 mt-1">Daniel Okafor · biometric verified</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.3em] text-black/50 mb-2">Authorisation</div>
          <div className="font-display font-bold">AVA · System</div>
          <div className="text-xs text-black/60">SHA-256 · 0x84f…c21a</div>
        </div>
      </div>
    </div>
  );
}

function DocRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-black/50">{label}</div>
      <div className={`font-display font-semibold mt-0.5 ${highlight ? "text-emerald-700" : "text-black"}`}>
        {value}
      </div>
    </div>
  );
}

function Pipeline() {
  const steps = [
    { label: "Voice captured", done: true },
    { label: "Entities extracted", done: true },
    { label: "ID verified", done: true },
    { label: "Defects mapped", done: true },
    { label: "Signature bound", done: true },
    { label: "Job card issued", done: true },
  ];
  return (
    <aside className="rounded-2xl glass p-6 self-start">
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-5 flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" /> Generation pipeline
      </div>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-3">
            <span className="relative grid place-items-center h-6 w-6 rounded-full bg-primary/15 border border-primary/40 text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {i < steps.length - 1 && <span className="absolute top-full h-4 w-px bg-primary/30" />}
            </span>
            <span className="text-sm">{s.label}</span>
          </li>
        ))}
      </ol>
      <button className="mt-6 w-full text-sm font-medium px-4 py-3 rounded-xl glass glow-emerald text-primary inline-flex items-center justify-center gap-2 hover:bg-primary/10 transition">
        <Printer className="h-4 w-4" /> Print job card
      </button>
    </aside>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 py-10 mt-10">
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
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
