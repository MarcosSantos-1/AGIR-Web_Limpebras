"use client";

import {
  deleteAgendaEvent,
  subscribeAgendaEvents,
  updateAgendaEventFields,
} from "@/lib/firestore/agenda";
import { replaceDataUrlsWithStorage } from "@/lib/storage/upload-helpers";
import {
  type AgendaEvent,
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

type EditableAgendaKeys =
  | "title"
  | "status"
  | "date"
  | "time"
  | "endTime"
  | "location"
  | "subregional"
  | "responsible"
  | "equipe"
  | "equipeIntegrantes"
  | "observations"
  | "completionDescription"
  | "completionPhotoDataUrls"
  | "linksPostagem";

type AgendaEventsContextValue = {
  events: AgendaEvent[];
  updateEvent: (
    id: number,
    patch: Partial<Pick<AgendaEvent, EditableAgendaKeys>>,
  ) => Promise<void>;
  deleteEvent: (id: number) => Promise<void>;
  getEvent: (id: string | number) => AgendaEvent | undefined;
  hydrated: boolean;
};

const AgendaEventsContext = createContext<AgendaEventsContextValue | null>(null);

export function AgendaEventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = subscribeAgendaEvents(
      (list) => {
        setEvents(list);
        setHydrated(true);
      },
      () => setHydrated(true),
    );
    return () => unsub();
  }, []);

  const updateEvent = useCallback(
    async (id: number, patch: Partial<Pick<AgendaEvent, EditableAgendaKeys>>) => {
      let toWrite = { ...patch };
      if (
        patch.completionPhotoDataUrls?.some((u) => u.startsWith("data:"))
      ) {
        const urls = await replaceDataUrlsWithStorage(
          patch.completionPhotoDataUrls,
          `agenda/${id}/completion`,
        );
        if (urls) {
          toWrite = { ...toWrite, completionPhotoDataUrls: urls };
        }
      }
      await updateAgendaEventFields(id, toWrite);
    },
    [],
  );

  const deleteEvent = useCallback(async (id: number) => {
    await deleteAgendaEvent(id);
  }, []);

  const getEvent = useCallback(
    (id: string | number) => events.find((e) => String(e.id) === String(id)),
    [events],
  );

  const value = useMemo(
    () => ({
      events,
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
