"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AccentColorId =
  | "fuchsia"
  | "indigo"
  | "blue"
  | "cyan"
  | "emerald"
  | "lime"
  | "amber"
  | "orange"
  | "red"
  | "rose"
  | "slate";

export type AccentColorDef = {
  id: AccentColorId;
  label: string;
  start: string;
  end: string;
  accent: string;
};

export const ACCENT_COLORS: AccentColorDef[] = [
  { id: "fuchsia", label: "Fúcsia", start: "#f318e3", end: "#6a0eaf", accent: "#9b0ba6" },
  { id: "indigo", label: "Índigo", start: "#6366f1", end: "#312e81", accent: "#4338ca" },
  { id: "blue", label: "Azul", start: "#3b82f6", end: "#1e3a8a", accent: "#1d4ed8" },
  { id: "cyan", label: "Ciano", start: "#06b6d4", end: "#0e7490", accent: "#0891b2" },
  { id: "emerald", label: "Esmeralda", start: "#10b981", end: "#065f46", accent: "#047857" },
  { id: "lime", label: "Lima", start: "#84cc16", end: "#3f6212", accent: "#4d7c0f" },
  { id: "amber", label: "Âmbar", start: "#f59e0b", end: "#92400e", accent: "#b45309" },
  { id: "orange", label: "Laranja", start: "#fb923c", end: "#9a3412", accent: "#c2410c" },
  { id: "red", label: "Vermelho", start: "#ef4444", end: "#7f1d1d", accent: "#b91c1c" },
  { id: "rose", label: "Rosa", start: "#f43f5e", end: "#881337", accent: "#be123c" },
  { id: "slate", label: "Grafite", start: "#64748b", end: "#1e293b", accent: "#334155" },
];

const STORAGE_KEY = "agir.accentColor";
const DEFAULT_ACCENT: AccentColorId = "fuchsia";

function findAccent(id: AccentColorId): AccentColorDef {
  return ACCENT_COLORS.find((c) => c.id === id) ?? ACCENT_COLORS[0]!;
}

function applyAccentToDocument(def: AccentColorDef) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--gradient-start", def.start);
  root.style.setProperty("--gradient-end", def.end);
  root.style.setProperty("--gradient-accent", def.accent);
}

type Ctx = {
  accentId: AccentColorId;
  accent: AccentColorDef;
  setAccent: (id: AccentColorId) => void;
  options: AccentColorDef[];
};

const AccentColorContext = createContext<Ctx | null>(null);

export function AccentColorProvider({ children }: { children: ReactNode }) {
  const [accentId, setAccentId] = useState<AccentColorId>(DEFAULT_ACCENT);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && ACCENT_COLORS.some((c) => c.id === saved)) {
        const id = saved as AccentColorId;
        setAccentId(id);
        applyAccentToDocument(findAccent(id));
      } else {
        applyAccentToDocument(findAccent(DEFAULT_ACCENT));
      }
    } catch {
      applyAccentToDocument(findAccent(DEFAULT_ACCENT));
    }
  }, []);

  const setAccent = useCallback((id: AccentColorId) => {
    setAccentId(id);
    const def = findAccent(id);
    applyAccentToDocument(def);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore quota errors */
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      accentId,
      accent: findAccent(accentId),
      setAccent,
      options: ACCENT_COLORS,
    }),
    [accentId, setAccent],
  );

  return (
    <AccentColorContext.Provider value={value}>
      {children}
    </AccentColorContext.Provider>
  );
}

export function useAccentColor(): Ctx {
  const ctx = useContext(AccentColorContext);
  if (!ctx) {
    throw new Error("useAccentColor must be used inside AccentColorProvider");
  }
  return ctx;
}
