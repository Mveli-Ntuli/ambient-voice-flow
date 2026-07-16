import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Shield, Flame, HeartPulse, type LucideIcon } from "lucide-react";

export type DepartmentKey = "police" | "fire" | "health";

export type DepartmentField = {
  key: string;
  label: string;
  type: "text" | "toggle" | "select" | "number";
  options?: string[];
  placeholder?: string;
};

export type SimulatedCall = {
  transcript: string;
  extract: Record<string, string>;
};

export type DepartmentConfig = {
  key: DepartmentKey;
  name: string;
  agency: string;
  tagline: string;
  icon: LucideIcon;
  // OKLCH theme values injected as CSS variables (overrides --primary etc.)
  theme: {
    primary: string;      // oklch(...)
    primaryFg: string;
    secondary: string;
    ring: string;
    accentHex: string;    // for gradients / raw color
    glow: string;
  };
  docTitle: string;
  docPrefix: string; // e.g. SAPS, FRS, EMS
  fields: DepartmentField[];
  simulated: SimulatedCall;
};

export const DEPARTMENTS: Record<DepartmentKey, DepartmentConfig> = {
  police: {
    key: "police",
    name: "Police",
    agency: "South African Police Service",
    tagline: "SAPS · Case Incident Docket",
    icon: Shield,
    theme: {
      primary: "oklch(0.52 0.19 265)",       // royal cobalt blue
      primaryFg: "oklch(0.98 0 0)",
      secondary: "oklch(0.68 0.15 250)",
      ring: "oklch(0.52 0.19 265 / 60%)",
      accentHex: "#1E40AF",
      glow: "oklch(0.62 0.20 265)",
    },
    docTitle: "Official Case Incident Docket",
    docPrefix: "SAPS",
    fields: [
      { key: "suspect", label: "Suspect Description", type: "text", placeholder: "Height, clothing, distinguishing marks…" },
      { key: "weapons", label: "Weapons Present", type: "toggle" },
      { key: "vehicleMake", label: "Vehicle Make/Model", type: "text", placeholder: "e.g. Toyota Hilux (white)" },
      { key: "vehiclePlate", label: "Registration Plate", type: "text", placeholder: "e.g. CA 123 456" },
      { key: "caseCategory", label: "Case File Category", type: "select", options: ["Armed Robbery", "Assault", "Burglary", "Domestic Violence", "Motor Vehicle Theft", "Other"] },
      { key: "location", label: "Incident Location", type: "text", placeholder: "Street, suburb" },
    ],
    simulated: {
      transcript:
        "Dispatch, this is Constable Naidoo. We have an armed robbery in progress at 47 Long Street, Cape Town CBD. Suspect is a male, approximately 1.8 metres tall, wearing a black hoodie and denim jeans. He is armed with a handgun. Suspect fled in a white Toyota Hilux, registration CA 123 456, heading north on Buitenkant Street. No injuries reported at this stage.",
      extract: {
        suspect: "Male, ~1.8m, black hoodie, denim jeans",
        weapons: "Yes",
        vehicleMake: "Toyota Hilux (white)",
        vehiclePlate: "CA 123 456",
        caseCategory: "Armed Robbery",
        location: "47 Long Street, Cape Town CBD",
      },
    },
  },
  fire: {
    key: "fire",
    name: "Fire & Rescue",
    agency: "Emergency Fire Services",
    tagline: "FRS · Structural & HAZMAT Dispatch",
    icon: Flame,
    theme: {
      primary: "oklch(0.62 0.22 25)",         // crimson red
      primaryFg: "oklch(0.98 0 0)",
      secondary: "oklch(0.78 0.16 55)",       // ember amber
      ring: "oklch(0.62 0.22 25 / 60%)",
      accentHex: "#DC2626",
      glow: "oklch(0.72 0.22 30)",
    },
    docTitle: "Structural Fire & HAZMAT Dispatch Sheet",
    docPrefix: "FRS",
    fields: [
      { key: "structure", label: "Structure Type", type: "select", options: ["Residential", "Commercial", "Industrial", "Vehicle", "Wildland"] },
      { key: "hazmat", label: "HAZMAT Risk Level", type: "select", options: ["None", "Low", "Moderate", "High", "Critical"] },
      { key: "waterSource", label: "Water Source / Hydrant Distance", type: "text", placeholder: "e.g. Hydrant 40m NW" },
      { key: "entrapped", label: "Entrapped Persons", type: "number", placeholder: "0" },
      { key: "utilities", label: "Utility Isolation Required", type: "toggle" },
      { key: "location", label: "Scene Address", type: "text", placeholder: "Street, suburb" },
    ],
    simulated: {
      transcript:
        "Fire Control, Station 4 reporting. Structural fire at 22 Kloof Avenue — three-storey residential building with heavy smoke on the second floor, likely originating from a kitchen. HAZMAT risk moderate, gas main in the building. Nearest hydrant approximately 40 metres northwest. Two occupants reported trapped on the top floor. Request utility isolation and additional appliance.",
      extract: {
        structure: "Residential",
        hazmat: "Moderate",
        waterSource: "Hydrant 40m NW",
        entrapped: "2",
        utilities: "Yes",
        location: "22 Kloof Avenue",
      },
    },
  },
  health: {
    key: "health",
    name: "Health",
    agency: "Emergency Medical Services",
    tagline: "EMS · Triage & Patient Report",
    icon: HeartPulse,
    theme: {
      primary: "oklch(0.62 0.11 190)",        // clinical teal
      primaryFg: "oklch(0.98 0 0)",
      secondary: "oklch(0.82 0.13 165)",      // mint
      ring: "oklch(0.62 0.11 190 / 60%)",
      accentHex: "#0D9488",
      glow: "oklch(0.75 0.13 180)",
    },
    docTitle: "EMS Triage & Patient Report Form",
    docPrefix: "EMS",
    fields: [
      { key: "patientAge", label: "Patient Age", type: "number", placeholder: "e.g. 58" },
      { key: "patientGender", label: "Gender", type: "select", options: ["Male", "Female", "Other", "Unknown"] },
      { key: "consciousness", label: "Level of Consciousness", type: "select", options: ["Alert", "Voice-responsive", "Pain-responsive", "Unresponsive"] },
      { key: "symptoms", label: "Primary Symptoms", type: "text", placeholder: "Chest pain, shortness of breath…" },
      { key: "history", label: "Pre-existing Conditions", type: "text", placeholder: "Hypertension, diabetes…" },
      { key: "triage", label: "Triage Level", type: "select", options: ["Red (Critical)", "Orange (Urgent)", "Green (Stable)"] },
    ],
    simulated: {
      transcript:
        "EMS Control, Unit 7 on scene. Fifty-eight-year-old male, alert but disoriented, complaining of severe chest pain radiating to the left arm and shortness of breath. Known history of hypertension and type-two diabetes. Skin pale and clammy. Vitals unstable — suspected acute myocardial infarction. Triage red. Transporting to Groote Schuur cardiac unit.",
      extract: {
        patientAge: "58",
        patientGender: "Male",
        consciousness: "Alert",
        symptoms: "Severe chest pain, radiating left arm, shortness of breath",
        history: "Hypertension, Type-2 diabetes",
        triage: "Red (Critical)",
      },
    },
  },
};

export const DEPARTMENT_ORDER: DepartmentKey[] = ["police", "fire", "health"];

const STORAGE_KEY = "ava.department";

type DepartmentContextValue = {
  ready: boolean;
  department: DepartmentConfig | null;
  select: (key: DepartmentKey) => void;
  clear: () => void;
};

const DepartmentContext = createContext<DepartmentContextValue | null>(null);

export function DepartmentProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [key, setKey] = useState<DepartmentKey | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as DepartmentKey | null;
      if (stored && DEPARTMENTS[stored]) setKey(stored);
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!key) return;
    const dep = DEPARTMENTS[key];
    const root = document.documentElement;
    root.style.setProperty("--primary", dep.theme.primary);
    root.style.setProperty("--primary-foreground", dep.theme.primaryFg);
    root.style.setProperty("--secondary", dep.theme.secondary);
    root.style.setProperty("--ring", dep.theme.ring);
    root.style.setProperty("--accent", dep.theme.secondary);
    root.setAttribute("data-dept", key);
  }, [key]);

  const value: DepartmentContextValue = {
    ready,
    department: key ? DEPARTMENTS[key] : null,
    select: (k) => {
      try { window.localStorage.setItem(STORAGE_KEY, k); } catch {}
      setKey(k);
    },
    clear: () => {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
      const root = document.documentElement;
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
      root.style.removeProperty("--secondary");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--accent");
      root.removeAttribute("data-dept");
      setKey(null);
    },
  };

  return <DepartmentContext.Provider value={value}>{children}</DepartmentContext.Provider>;
}

export function useDepartment(): DepartmentContextValue {
  const ctx = useContext(DepartmentContext);
  if (!ctx) throw new Error("useDepartment must be used within <DepartmentProvider>");
  return ctx;
}
