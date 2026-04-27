"use client";

import {
  agendaEvents,
  type AgendaEvent,
  type AgendaEventStatus,
} from "@/data/agenda-events";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "agir_agenda_v1";
const DELETED_KEY = "agir_agenda_deleted_v1";

type EditableAgendaKeys =
  | "title"
  | "status"
  | "date"
  | "time"
  | "endTime"
  | "location"
  | "responsible"
  | "observations"
  | "completionDescription"
  | "completionPhotoDataUrls";

type AgendaOverride = Partial<Pick<AgendaEvent, EditableAgendaKeys>>;

type AgendaOverridesMap = Record<number, AgendaOverride>;

function loadOverrides(): AgendaOverridesMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, AgendaOverride>;
    return Object.fromEntries(
      Object.entries(parsed).map(([k, v]) => [Number(k), v]),
    );
  } catch {
    return {};
  }
}

function loadDeletedIds(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as number[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveOverrides(map: AgendaOverridesMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

function saveDeletedIds(set: Set<number>) {
  try {
    localStorage.setItem(DELETED_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

function mergeEvent(base: AgendaEvent, o?: AgendaOverride): AgendaEvent {
  if (!o) return base;
  return {
    ...base,
    ...o,
  };
}

type AgendaEventsContextValue = {
  events: AgendaEvent[];
  baseEvents: AgendaEvent[];
  updateEvent: (id: number, patch: Partial<Pick<AgendaEvent, EditableAgendaKeys>>) => void;
  deleteEvent: (id: number) => void;
  getEvent: (id: string | number) => AgendaEvent | undefined;
  hydrated: boolean;
};

const AgendaEventsContext = createContext<AgendaEventsContextValue | null>(null);

export function AgendaEventsProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<AgendaOverridesMap>({});
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOverrides(loadOverrides());
    setDeletedIds(loadDeletedIds());
    setHydrated(true);
  }, []);

  const events = useMemo(() => {
    return agendaEvents
      .filter((e) => !deletedIds.has(e.id))
      .map((e) => mergeEvent(e, overrides[e.id]));
  }, [overrides, deletedIds]);

  const updateEvent = useCallback(
    (id: number, patch: Partial<Pick<AgendaEvent, EditableAgendaKeys>>) => {
      setOverrides((prev) => {
        const cur: AgendaOverride = { ...prev[id] };
        (Object.keys(patch) as (keyof typeof patch)[]).forEach((k) => {
          const v = patch[k];
          if (v !== undefined) (cur as Record<string, unknown>)[k] = v;
        });
        const next = { ...prev, [id]: cur };
        saveOverrides(next);
        return next;
      });
    },
    [],
  );

  const deleteEvent = useCallback((id: number) => {
    setDeletedIds((prev) => {
      const n = new Set(prev);
      n.add(id);
      saveDeletedIds(n);
      return n;
    });
  }, []);

  const getEvent = useCallback(
    (id: string | number) => {
      return events.find((e) => String(e.id) === String(id));
    },
    [events],
  );

  const value = useMemo(
    () => ({
      events,
      baseEvents: agendaEvents,
      updateEvent,
      deleteEvent,
      getEvent,
      hydrated,
    }),
    [events, updateEvent, deleteEvent, getEvent, hydrated],
  );

  return (
    <AgendaEventsContext.Provider value={value}>
      {children}
    </AgendaEventsContext.Provider>
  );
}

export function useAgendaEvents() {
  const ctx = useContext(AgendaEventsContext);
  if (!ctx) {
    throw new Error("useAgendaEvents must be used within AgendaEventsProvider");
  }
  return ctx;
}
