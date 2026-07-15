import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Copy, KeyRound, ShieldCheck, User, Fingerprint, DoorClosed, ArrowLeft, Sparkles } from "lucide-react";
import { loadReceptionDB, writeReceptionDB } from "@/components/auth-gate";

export const Route = createFileRoute("/reception")({
  head: () => ({
    meta: [
      { title: "Reception Desk Portal — Zero-Form AVA" },
      { name: "description", content: "Administrative portal for provisioning resident placements and reference codes." },
    ],
  }),
  component: Reception,
});

const RESIDENCES = ["North Campus Hall", "Marina Court", "Harbor Wing", "Bayview Suites"];

type IssuedRecord = {
  code: string;
  name: string;
  nationalId: string;
  room: string;
  residence: string;
  paid: boolean;
  createdAt: number;
};

function randomCode() {
  return "NMU-RES-" + Math.floor(1000 + Math.random() * 9000).toString();
}

function Reception() {
  const [name, setName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [room, setRoom] = useState("");
  const [residence, setResidence] = useState(RESIDENCES[0]);
  const [paid, setPaid] = useState(false);
  const [issued, setIssued] = useState<IssuedRecord[]>(() => {
    const db = loadReceptionDB();
    return Object.entries(db)
      .filter(([, v]) => v.name)
      .map(([code, v]) => ({
        code,
        name: v.name || "",
        nationalId: v.nationalId || "",
        room: v.room,
        residence: v.residence,
        paid: !!v.paid,
        createdAt: v.createdAt || 0,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  });
  const [flash, setFlash] = useState<string | null>(null);

  const canProvision = useMemo(
    () => name.trim() && nationalId.trim() && room.trim() && paid,
    [name, nationalId, room, paid],
  );

  const provision = () => {
    if (!canProvision) return;
    const db = loadReceptionDB();
    let code = randomCode();
    while (db[code]) code = randomCode();
    const rec: IssuedRecord = {
      code,
      name: name.trim(),
      nationalId: nationalId.trim(),
      room: room.trim(),
      residence,
      paid: true,
      createdAt: Date.now(),
    };
    db[code] = { room: rec.room, residence: rec.residence, name: rec.name, nationalId: rec.nationalId, paid: true, createdAt: rec.createdAt };
    writeReceptionDB(db);
    setIssued((arr) => [rec, ...arr]);
    setFlash(code);
    setName("");
    setNationalId("");
    setRoom("");
    setPaid(false);
    setTimeout(() => setFlash(null), 4000);
  };

  const copy = async (v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      setFlash(v);
      setTimeout(() => setFlash(null), 1600);
    } catch {}
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground font-sans">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[38rem] w-[38rem] rounded-full bg-primary/15 blur-3xl animate-[ava-orb-a_18s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 -right-40 h-[42rem] w-[42rem] rounded-full bg-secondary/15 blur-3xl animate-[ava-orb-b_22s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-primary/40 blur-lg" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 backdrop-blur">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80">Administrative</div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Reception Desk Portal</h1>
              <p className="text-xs text-muted-foreground">Provision resident placements and issue reference codes.</p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign-in
          </Link>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
          {/* Provisioning form */}
          <section className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.65)] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-8">
            <div className="mb-6 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> Provision placement
            </div>

            <div className="space-y-4">
              <Field label="Full Name" icon={User}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mveli Ntuli"
                  className="w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
                />
              </Field>

              <Field label="National ID Number (system key / email identifier)" icon={Fingerprint}>
                <input
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="9302145678910"
                  className="w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 font-mono text-sm tracking-wider outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Room Number" icon={DoorClosed}>
                  <input
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="204B"
                    className="w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
                  />
                </Field>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Residence</span>
                  <select
                    value={residence}
                    onChange={(e) => setResidence(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/30 py-2.5 px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
                  >
                    {RESIDENCES.map((r) => (
                      <option key={r} value={r} className="bg-slate-900">{r}</option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                type="button"
                onClick={() => setPaid((v) => !v)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                  paid
                    ? "border-primary/50 bg-primary/10 shadow-[0_0_28px_-10px_var(--primary)]"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <div>
                  <div className="text-sm font-semibold">Payment Confirmed</div>
                  <div className="text-[11px] text-muted-foreground">Toggle on once fees have cleared reception.</div>
                </div>
                <span
                  className={`inline-flex h-6 w-11 items-center rounded-full transition ${
                    paid ? "bg-primary/40" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      paid ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </span>
              </button>

              <button
                type="button"
                onClick={provision}
                disabled={!canProvision}
                className="group relative w-full overflow-hidden rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[0_0_32px_-8px_var(--primary)] transition-all hover:shadow-[0_0_44px_-4px_var(--primary)] disabled:opacity-40"
              >
                <span className="relative z-10 inline-flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Provision Placement
                </span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </button>

              {flash && flash.startsWith("NMU-RES-") && (
                <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm">
                  <div className="mb-1 text-[10px] uppercase tracking-widest text-primary">Placement provisioned</div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-lg tracking-widest text-primary">{flash}</span>
                    <button
                      onClick={() => copy(flash)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/30 px-2.5 py-1 text-xs hover:bg-white/[0.06]"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Share this code with the resident. They can now register using their National ID and this reference.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Ledger */}
          <section className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.55)] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Issued placements
              </div>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{issued.length} total</span>
            </div>

            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {issued.length === 0 && (
                <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs italic text-muted-foreground/70">
                  No placements provisioned yet.
                </div>
              )}
              {issued.map((rec) => (
                <div
                  key={rec.code}
                  className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs transition hover:border-primary/30 hover:bg-primary/[0.04]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold tracking-widest text-primary">{rec.code}</span>
                    <button
                      onClick={() => copy(rec.code)}
                      className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[10px] hover:bg-white/[0.06]"
                    >
                      <Copy className="h-2.5 w-2.5" /> {flash === rec.code ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="mt-1.5 text-foreground">{rec.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span>ID: <span className="font-mono">{rec.nationalId}</span></span>
                    <span>·</span>
                    <span>Room {rec.room}</span>
                    <span>·</span>
                    <span>{rec.residence}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="group relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
        {children}
      </div>
    </label>
  );
}
