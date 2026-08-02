import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Mic, MicOff, Radio, Sparkles, Download, PlayCircle,
  Shield, AlertTriangle, MapPin, FileText, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { useDepartment, DEPARTMENTS, type DepartmentConfig, type DepartmentField } from "@/lib/department";
import { useDemoAuth } from "@/components/auth-gate";
import { recordActivity } from "@/lib/activity";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dispatch Portal — Zero-Form AVA" },
      { name: "description", content: "Government Dispatch command terminal. Ambient voice, live transcription and department-specific incident documents." },
    ],
  }),
  component: DispatchPortal,
});

/* ---------- Regex extractor: parses transcript into department fields ---------- */
type Extracted = Record<string, string>;

function extractFromTranscript(dep: DepartmentConfig, transcript: string): Extracted {
  const out: Extracted = {};
  const t = transcript;
  const lower = t.toLowerCase();

  // Cross-department: location heuristic
  const loc = t.match(/at ([\w\s\d,]+?)(?:\.|,|$| —|;| heading| \bin\b)/i);
  if (loc) out.location = loc[1].trim();

  if (dep.key === "police") {
    // Suspect
    const suspect = t.match(/suspect (?:is )?([^.]+?)(?:\.|,)/i);
    if (suspect) out.suspect = suspect[1].trim();
    // Weapons
    if (/\b(armed|handgun|firearm|pistol|rifle|knife|weapon)\b/i.test(t)) out.weapons = "Yes";
    // Vehicle make/model  (word capitalized after "in a" or "vehicle")
    const veh = t.match(/(?:in a|driving a|vehicle[: ]+)\s*([A-Z][a-z]+ [A-Z][a-z]+(?:\s*\([^)]+\))?)/);
    if (veh) out.vehicleMake = veh[1].trim();
    // Plate: uppercase letters/digits/spaces
    const plate = t.match(/\b([A-Z]{2}\s?\d{2,3}\s?\d{2,4}|[A-Z]{2,3}\s?\d{3,4})\b/);
    if (plate) out.vehiclePlate = plate[1].trim();
    // Case category
    if (/armed robbery/i.test(t)) out.caseCategory = "Armed Robbery";
    else if (/assault/i.test(t)) out.caseCategory = "Assault";
    else if (/burglary|break-in/i.test(t)) out.caseCategory = "Burglary";
    else if (/domestic/i.test(t)) out.caseCategory = "Domestic Violence";
    else if (/theft/i.test(t)) out.caseCategory = "Motor Vehicle Theft";
  }

  if (dep.key === "fire") {
    if (/residential|apartment|house|home/i.test(t)) out.structure = "Residential";
    else if (/commercial|office|shop|warehouse/i.test(t)) out.structure = "Commercial";
    else if (/industrial|factory|plant/i.test(t)) out.structure = "Industrial";
    else if (/vehicle|car fire/i.test(t)) out.structure = "Vehicle";
    if (/hazmat|chemical|gas main|toxic|flammable/i.test(t)) out.hazmat = /critical|explosive/i.test(t) ? "Critical" : /high|toxic/i.test(t) ? "High" : "Moderate";
    const hydrant = t.match(/hydrant[^.,]*?(\d+)\s*(?:m|metres|meters)[^.,]*/i);
    if (hydrant) out.waterSource = `Hydrant ${hydrant[1]}m`;
    const trapped = t.match(/(\d+|two|three|four|five)\s+(?:occupants?|persons?|people)\s+(?:reported\s+)?trapped/i);
    if (trapped) {
      const map: Record<string, string> = { two: "2", three: "3", four: "4", five: "5" };
      out.entrapped = map[trapped[1].toLowerCase()] || trapped[1];
    }
    if (/utility isolation|gas isolation|shut off/i.test(t)) out.utilities = "Yes";
  }

  if (dep.key === "health") {
    const age = t.match(/(\d{1,3})[-\s]?year[-\s]?old|(\d{1,3})\s*yo\b/i);
    if (age) out.patientAge = age[1] || age[2];
    if (/\bmale\b/i.test(lower) && !/female/i.test(lower.slice(0, lower.indexOf(" male")))) out.patientGender = "Male";
    if (/\bfemale\b/i.test(lower)) out.patientGender = "Female";
    if (/unresponsive/i.test(t)) out.consciousness = "Unresponsive";
    else if (/pain[-\s]?responsive/i.test(t)) out.consciousness = "Pain-responsive";
    else if (/voice[-\s]?responsive/i.test(t)) out.consciousness = "Voice-responsive";
    else if (/alert/i.test(t)) out.consciousness = "Alert";
    const symMatch = t.match(/complaining of ([^.]+?)(?:\.|,\s*known)/i);
    if (symMatch) out.symptoms = symMatch[1].trim();
    const histMatch = t.match(/history of ([^.]+?)(?:\.|,)/i);
    if (histMatch) out.history = histMatch[1].trim();
    if (/triage red|red triage|critical/i.test(t)) out.triage = "Red (Critical)";
    else if (/triage orange|urgent/i.test(t)) out.triage = "Orange (Urgent)";
    else if (/triage green|stable/i.test(t)) out.triage = "Green (Stable)";
  }

  return out;
}

/* ---------- Main component ---------- */
function DispatchPortal() {
  const { department } = useDepartment();
  if (!department) return null; // guarded by AuthGate
  return <DispatchWorkspace dep={department} />;
}

function DispatchWorkspace({ dep }: { dep: DepartmentConfig }) {
  const accent = dep.theme.accentHex;
  const Icon = dep.icon;
  const { session } = useDemoAuth();

  const log = (action: string, category: string, summary: string, durationMs?: number) => {
    if (!session?.email) return;
    recordActivity({
      actorEmail: session.email,
      actorBadge: session.badge,
      department: session.department,
      action,
      category,
      summary,
      durationMs,
    });
  };

  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [extracted, setExtracted] = useState<Extracted>({});
  const [manual, setManual] = useState<Extracted>({});
  const [simulating, setSimulating] = useState(false);
  const [exportState, setExportState] = useState<"idle" | "generating" | "done">("idle");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const recordStartRef = useRef<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const simTimerRef = useRef<number | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);

  // Reset all state when department changes
  useEffect(() => {
    stopRecording();
    stopSimulation();
    setTranscript("");
    setExtracted({});
    setManual({});
    setExportState("idle");
    setTouched({});
    setSubmitAttempted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep.key]);

  // Re-extract when transcript changes
  useEffect(() => {
    if (!transcript) return setExtracted({});
    setExtracted(extractFromTranscript(dep, transcript));
  }, [transcript, dep]);

  // Auto-scroll transcript
  useEffect(() => {
    const el = transcriptScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  const merged: Extracted = useMemo(() => ({ ...extracted, ...manual }), [extracted, manual]);

  function startWaveform() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      analyser.getByteTimeDomainData(buf);
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      // subtle backdrop
      ctx.fillStyle = "rgba(15,23,42,0.35)";
      ctx.fillRect(0, 0, width, height);
      // Bar-style waveform
      const bars = 48;
      const step = Math.floor(buf.length / bars);
      const barW = width / bars;
      for (let i = 0; i < bars; i++) {
        const v = buf[i * step] / 128 - 1; // -1..1
        const h = Math.max(4, Math.abs(v) * height * 0.9);
        const x = i * barW + barW * 0.15;
        const y = (height - h) / 2;
        const w = barW * 0.7;
        ctx.fillStyle = accent;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 12;
        ctx.fillRect(x, y, w, h);
      }
      ctx.shadowBlur = 0;
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
  }

  async function startRecording() {
    stopSimulation();
    setTranscript("");
    setExtracted({});
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AC();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      setRecording(true);
      recordStartRef.current = Date.now();
      log("Call recording started", "capture", `${dep.agency} live microphone capture opened`);
      requestAnimationFrame(startWaveform);
    } catch {
      // Fallback: just enable simulated waveform-like animation would be nice, but we'll surface a hint
      setRecording(true);
      recordStartRef.current = Date.now();
      log("Call recording failed", "capture", "Microphone permission denied or unavailable");
      setTranscript("[Microphone unavailable — click 'Simulate Department Call' to preview the flow.]");
    }
  }

  function stopRecording() {
    if (recordStartRef.current) {
      const duration = Date.now() - recordStartRef.current;
      recordStartRef.current = null;
      log(
        "Call recording stopped",
        "capture",
        `${Math.round(duration / 1000)}s captured · ${Object.keys(extracted).length} fields auto-extracted`,
        duration,
      );
    }
    setRecording(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    const c = canvasRef.current;
    if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
  }

  function stopSimulation() {
    if (simTimerRef.current) window.clearInterval(simTimerRef.current);
    simTimerRef.current = null;
    setSimulating(false);
  }

  function simulateCall() {
    stopRecording();
    setTranscript("");
    setExtracted({});
    setManual({});
    setSimulating(true);
    log("Simulated call started", "capture", `${dep.name} training scenario replayed`);
    const full = dep.simulated.transcript;
    let i = 0;
    const step = 25;
    simTimerRef.current = window.setInterval(() => {
      i += 3;
      const slice = full.slice(0, i);
      setTranscript(slice);
      if (i >= full.length) {
        window.clearInterval(simTimerRef.current!);
        simTimerRef.current = null;
        setSimulating(false);
        log(
          "Fields auto-extracted",
          "extraction",
          `${Object.keys(extractFromTranscript(dep, full)).length} of ${dep.fields.length} ${dep.name} fields populated from the transcript`,
        );
      }
    }, step);
  }

  useEffect(() => () => {
    stopRecording();
    stopSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField(key: string, value: string) {
    setManual((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  const missingFields = useMemo(
    () => dep.fields.filter((f) => f.required && !(merged[f.key] ?? "").trim()),
    [dep.fields, merged],
  );

  async function exportPdf() {
    setSubmitAttempted(true);
    if (missingFields.length > 0) {
      toast.error(
        `${missingFields.length} required field${missingFields.length > 1 ? "s" : ""} still missing: ${missingFields
          .map((f) => f.label)
          .join(", ")}`,
      );
      log("Export blocked by validation", "validation", `Missing: ${missingFields.map((f) => f.label).join(", ")}`);
      return;
    }
    setExportState("generating");
    try {
      await new Promise((r) => setTimeout(r, 400));
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const marginX = 48;
      let y = 56;

      // Header band
      const [r, g, b] = hexToRgb(accent);
      doc.setFillColor(r, g, b);
      doc.rect(0, 0, pageW, 8, "F");
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 8, pageW, 72, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(dep.agency.toUpperCase(), marginX, 34);
      doc.setFontSize(18);
      doc.text(dep.docTitle, marginX, 58);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const docNo = `${dep.docPrefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
      doc.text(`Docket No. ${docNo}`, pageW - marginX, 34, { align: "right" });
      doc.text(new Date().toLocaleString(), pageW - marginX, 58, { align: "right" });

      y = 110;
      doc.setTextColor(20, 20, 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("INCIDENT DETAILS", marginX, y);
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(1.5);
      doc.line(marginX, y + 4, marginX + 130, y + 4);
      y += 20;

      // Fields table
      doc.setFontSize(10);
      dep.fields.forEach((f) => {
        const val = merged[f.key] || "—";
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 80);
        doc.text(f.label + ":", marginX, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 15, 15);
        const wrapped = doc.splitTextToSize(val, pageW - marginX * 2 - 170);
        doc.text(wrapped as string[], marginX + 170, y);
        y += Math.max(16, (wrapped as string[]).length * 14);
      });

      // Transcript
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text("VOICE TRANSCRIPT", marginX, y);
      doc.line(marginX, y + 4, marginX + 140, y + 4);
      y += 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const transcriptLines = doc.splitTextToSize(transcript || "(no transcript captured)", pageW - marginX * 2);
      doc.text(transcriptLines as string[], marginX, y);
      y += (transcriptLines as string[]).length * 13 + 12;

      // Department-specific footer blocks
      if (dep.key === "police") {
        drawSignatureBlock(doc, marginX, y, pageW, "Arresting Officer Signature", "Case Stamp");
      } else if (dep.key === "fire") {
        drawChecklist(doc, marginX, y, pageW, [
          "Building safety clearance issued",
          "Gas / utility isolation confirmed",
          "Water supply secured",
          "HAZMAT team briefed",
        ]);
      } else {
        drawVitalsFooter(doc, marginX, y, pageW);
      }

      // Footer bar
      doc.setFillColor(r, g, b);
      doc.rect(0, doc.internal.pageSize.getHeight() - 6, pageW, 6, "F");

      doc.save(`${docNo}.pdf`);
      log("Secure PDF exported", "export", `${dep.docTitle} · Docket ${docNo}`);
      toast.success(`Docket ${docNo} downloaded.`);
      setExportState("done");
      setTimeout(() => setExportState("idle"), 2200);
    } catch (e) {
      console.error(e);
      setExportState("idle");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-y-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
            style={{ background: `${accent}22`, borderColor: `${accent}55` }}
          >
            <Icon className="h-5 w-5" style={{ color: accent }} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {dep.tagline}
            </div>
            <h1 className="truncate font-display text-2xl font-bold tracking-tight leading-tight">
              {dep.agency} — Command Terminal
            </h1>
          </div>
        </div>
        <button
          onClick={simulateCall}
          disabled={simulating}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border px-4 py-2 text-xs font-semibold transition hover:brightness-110 disabled:opacity-60 sm:self-auto"
          style={{ background: `${accent}18`, borderColor: `${accent}55`, color: accent }}
        >
          {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          Simulate Department Call
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left column: capture */}
        <div className="lg:col-span-3 flex flex-col gap-y-6">
          {/* Record card */}
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[rgba(15,23,42,0.55)] p-6 shadow-2xl backdrop-blur-xl">
            <div
              className="pointer-events-none absolute -top-32 -right-32 h-72 w-72 rounded-full opacity-30 blur-3xl"
              style={{ background: accent }}
            />
            <div className="relative flex flex-col items-center gap-y-5 text-center">
              <button
                onClick={recording ? stopRecording : startRecording}
                className="group relative flex h-40 w-40 items-center justify-center rounded-full transition-transform hover:scale-105 focus:outline-none"
                aria-label={recording ? "Stop recording" : "Start recording"}
              >
                <span
                  className={`absolute inset-0 rounded-full ${recording ? "animate-ping" : ""}`}
                  style={{ background: `${accent}33` }}
                />
                <span
                  className="absolute inset-2 rounded-full"
                  style={{ background: `${accent}22`, boxShadow: `0 0 60px 4px ${accent}66` }}
                />
                <span
                  className={`relative flex h-24 w-24 items-center justify-center rounded-full border-2 shadow-inner ${recording ? "animate-pulse" : ""}`}
                  style={{ borderColor: accent, background: `${accent}` }}
                >
                  {recording ? <MicOff className="h-10 w-10 text-white" /> : <Mic className="h-10 w-10 text-white" />}
                </span>
              </button>
              <div className="flex flex-col items-center gap-y-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  {recording ? "Listening…" : "Voice Capture"}
                </div>
                <div className="font-display text-lg font-bold tracking-tight leading-tight">
                  TAP TO RECORD INCOMING CALL
                </div>
              </div>
              <canvas
                ref={canvasRef}
                width={560}
                height={72}
                className="w-full max-w-lg rounded-xl border border-white/10 bg-black/30"
              />
            </div>
          </section>

          {/* Live transcript */}
          <section className="rounded-3xl border border-white/10 bg-[rgba(15,23,42,0.55)] p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4" style={{ color: accent }} />
                <h2 className="font-display text-sm font-bold uppercase tracking-widest">
                  Live Transcription
                </h2>
              </div>
              {(recording || simulating) && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-red-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  Streaming
                </span>
              )}
            </div>
            <div
              ref={transcriptScrollRef}
              className="max-h-56 min-h-[9rem] overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-4 text-sm leading-relaxed text-foreground/90"
            >
              {transcript ? (
                <span>
                  {transcript}
                  {(recording || simulating) && <span className="ml-0.5 inline-block w-2 animate-pulse" style={{ color: accent }}>▍</span>}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Awaiting incoming call. Tap the microphone or run a simulated call to begin.
                </span>
              )}
            </div>
          </section>

          {/* Extracted form */}
          <section className="rounded-3xl border border-white/10 bg-[rgba(15,23,42,0.55)] p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: accent }} />
              <h2 className="font-display text-sm font-bold uppercase tracking-widest">
                {dep.name} Intake Fields
              </h2>
            </div>
            {missingFields.length > 0 ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong className="font-semibold">
                    {missingFields.length} required field{missingFields.length > 1 ? "s" : ""} still needed:
                  </strong>{" "}
                  {missingFields.map((f) => f.label).join(", ")}. Fill these in (or capture more of the call) before
                  exporting the docket.
                </span>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                All required fields are complete — this docket is ready to export.
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {dep.fields.map((f) => (
                <FieldInput
                  key={f.key}
                  field={f}
                  value={merged[f.key] || ""}
                  extractedHit={!!extracted[f.key]}
                  accent={accent}
                  invalid={
                    !!f.required &&
                    !(merged[f.key] ?? "").trim() &&
                    (submitAttempted || !!touched[f.key])
                  }
                  onBlur={() => setTouched((prev) => ({ ...prev, [f.key]: true }))}
                  onChange={(v) => updateField(f.key, v)}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Right column: PDF preview + export */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-24 flex flex-col gap-y-4">
            <DocumentPreview dep={dep} merged={merged} transcript={transcript} accent={accent} />
            <button
              onClick={exportPdf}
              disabled={exportState === "generating"}
              className="group relative w-full overflow-hidden rounded-2xl py-4 text-sm font-bold uppercase tracking-widest text-white transition-all disabled:opacity-60"
              style={{ background: accent, boxShadow: `0 0 44px -8px ${accent}` }}
            >
              <span className="relative z-10 inline-flex items-center justify-center gap-2">
                {exportState === "generating" && <Loader2 className="h-4 w-4 animate-spin" />}
                {exportState === "done" && <CheckCircle2 className="h-4 w-4" />}
                {exportState === "idle" && <Download className="h-4 w-4" />}
                {exportState === "done" ? "PDF Downloaded" : "Export Secure PDF"}
              </span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Field input ---------- */
function FieldInput({
  field,
  value,
  onChange,
  onBlur,
  extractedHit,
  accent,
  invalid,
}: {
  field: DepartmentField;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  extractedHit: boolean;
  accent: string;
  invalid?: boolean;
}) {
  const filled = !!value.trim();
  const border = invalid
    ? "border-amber-500/60 focus:border-amber-400"
    : filled
      ? "border-emerald-500/40 focus:border-emerald-400/70"
      : "border-white/10 focus:border-primary/60";
  return (
    <label className="flex flex-col gap-y-1.5">
      <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {field.label}
        {field.required && <span className="text-amber-300" aria-hidden>*</span>}
        {extractedHit && (
          <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold normal-case tracking-normal" style={{ background: `${accent}22`, color: accent }}>
            <Sparkles className="h-2.5 w-2.5" /> auto
          </span>
        )}
      </span>
      {field.type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={invalid}
          className={`rounded-lg border bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25 ${border}`}
        >
          <option value="">Select…</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : field.type === "toggle" ? (
        <div className="flex gap-2" onBlur={onBlur}>
          {["Yes", "No"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${value === v ? "text-white" : `text-muted-foreground hover:text-foreground bg-black/20 ${invalid ? "border-amber-500/60" : "border-white/10"}`}`}
              style={value === v ? { background: accent, borderColor: accent } : undefined}
            >
              {v}
            </button>
          ))}
        </div>
      ) : (
        <input
          type={field.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={invalid}
          placeholder={field.placeholder}
          className={`rounded-lg border bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/25 ${border}`}
        />
      )}
      {invalid ? (
        <span className="flex items-center gap-1.5 text-[11px] text-amber-300">
          <AlertCircle className="h-3 w-3" />
          {field.label} is required — {field.help ?? "please complete this field."}
        </span>
      ) : field.help ? (
        <span className="text-[11px] text-muted-foreground">{field.help}</span>
      ) : null}
    </label>
  );
}

/* ---------- Document Preview ---------- */
function DocumentPreview({ dep, merged, transcript, accent }: { dep: DepartmentConfig; merged: Extracted; transcript: string; accent: string }) {
  const docNo = useMemo(() => `${dep.docPrefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`, [dep.key]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
      <div className="h-2" style={{ background: accent }} />
      <div className="bg-slate-900 px-5 py-4 text-white">
        <div className="text-[9px] font-bold uppercase tracking-[0.25em] opacity-70">{dep.agency}</div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="font-display text-base font-bold leading-tight">{dep.docTitle}</div>
          <div className="text-right text-[10px] opacity-80">
            <div className="font-mono">{docNo}</div>
            <div>{new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>
      <div className="px-5 py-4 text-slate-800">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Incident Details</div>
        <div className="mt-2 divide-y divide-slate-200">
          {dep.fields.map((f) => (
            <div key={f.key} className="grid grid-cols-[minmax(0,1fr)_2fr] gap-2 py-1.5 text-xs">
              <div className="font-semibold text-slate-600">{f.label}</div>
              <div className="min-w-0 break-words text-slate-900">{merged[f.key] || <span className="text-slate-400">—</span>}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Voice Transcript</div>
        <p className="mt-1 max-h-32 overflow-y-auto rounded-md bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-700">
          {transcript || <span className="text-slate-400">(no transcript captured)</span>}
        </p>

        {/* Department-specific footer */}
        {dep.key === "police" && (
          <div className="mt-4 grid grid-cols-2 gap-3 text-[10px]">
            <div>
              <div className="mb-6 border-b border-slate-300" />
              <div className="text-slate-500">Arresting Officer Signature</div>
            </div>
            <div className="flex items-center justify-center rounded-md border-2 border-dashed border-slate-300 py-4">
              <span className="rotate-[-8deg] font-bold uppercase tracking-widest text-slate-400">Case Stamp</span>
            </div>
          </div>
        )}
        {dep.key === "fire" && (
          <div className="mt-4 space-y-1.5 text-[11px]">
            {["Building safety clearance", "Gas / utility isolation", "Water supply secured", "HAZMAT team briefed"].map((c) => (
              <label key={c} className="flex items-center gap-2 text-slate-700">
                <span className="grid h-4 w-4 place-items-center rounded border border-slate-400 bg-white">
                  <span className="h-2 w-2 rounded-sm" style={{ background: accent }} />
                </span>
                {c}
              </label>
            ))}
          </div>
        )}
        {dep.key === "health" && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-[10px]">
            {[
              { l: "HR", v: "—" },
              { l: "BP", v: "—" },
              { l: "SpO₂", v: "—" },
              { l: "RR", v: "—" },
              { l: "Temp", v: "—" },
              { l: "GCS", v: "—" },
            ].map((v) => (
              <div key={v.l} className="rounded-md border border-slate-200 p-2 text-center">
                <div className="font-bold text-slate-500">{v.l}</div>
                <div className="text-slate-800">{v.v}</div>
              </div>
            ))}
            <div className="col-span-3 mt-2 rounded-md border border-dashed border-slate-300 p-3 text-slate-500">
              Paramedic handover notes:
              <div className="mt-3 h-8 border-b border-slate-300" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- PDF helpers ---------- */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function drawSignatureBlock(doc: jsPDF, x: number, y: number, pageW: number, sigLabel: string, stampLabel: string) {
  const rightX = pageW / 2 + 20;
  doc.setDrawColor(120, 120, 120);
  doc.line(x, y + 40, x + 200, y + 40);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(sigLabel, x, y + 54);
  doc.setLineDashPattern([3, 3], 0);
  doc.rect(rightX, y, 160, 60);
  doc.setLineDashPattern([], 0);
  doc.setTextColor(160, 160, 160);
  doc.text(stampLabel, rightX + 80, y + 34, { align: "center" });
}
function drawChecklist(doc: jsPDF, x: number, y: number, pageW: number, items: string[]) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text("BUILDING SAFETY CHECKLIST", x, y);
  doc.setLineWidth(1.5);
  doc.line(x, y + 4, x + 200, y + 4);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  items.forEach((c) => {
    doc.rect(x, y - 9, 10, 10);
    doc.text(c, x + 18, y);
    y += 18;
  });
}
function drawVitalsFooter(doc: jsPDF, x: number, y: number, pageW: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text("VITALS & HANDOVER", x, y);
  doc.setLineWidth(1.5);
  doc.line(x, y + 4, x + 170, y + 4);
  y += 18;
  const cols = ["HR", "BP", "SpO2", "RR", "Temp", "GCS"];
  const colW = (pageW - x * 2) / cols.length;
  doc.setFontSize(9);
  cols.forEach((c, i) => {
    doc.rect(x + i * colW, y, colW - 6, 40);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(c, x + i * colW + 6, y + 14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 160);
    doc.text("—", x + i * colW + 6, y + 32);
  });
  y += 52;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("Paramedic Handover Notes:", x, y);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(x, y + 30, pageW - x, y + 30);
  doc.line(x, y + 50, pageW - x, y + 50);
  doc.setLineDashPattern([], 0);
}
