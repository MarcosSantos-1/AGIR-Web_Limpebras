"use client";

import { calendarMonthFirestoreRange } from "@/lib/date/agenda-view-range";
import {
  fetchAgendaEventByNumericId,
  subscribeAgendaEventsInDateRange,
} from "@/lib/firestore/agenda";
import type { AgendaEvent } from "@/data/agenda-events";
import { useEffect, useMemo, useState } from "react";

type ViewMode = "week" | "month" | "list";

function sortEv(a: AgendaEvent, b: AgendaEvent): number {
  return a.date !== b.date
    ? a.date.localeCompare(b.date)
    : a.time.localeCompare(b.time);
}

/**
 * Lista de eventos limitada ao intervalo relevante para a página Agenda (+ extras).
 */
export function useAgendaViewportEvents(
  selectedDate: Date,
  _viewMode: ViewMode,
  extraIsoDays: Array<string | null | undefined>,
): { events: AgendaEvent[]; hydrated: boolean } {
  const extraKey = extraIsoDays
    .map((x) => (x ?? ""))
    .join("|");

  const anchorMs = selectedDate?.valueOf?.() ?? 0;

  const bounds = useMemo(
    () =>
      calendarMonthFirestoreRange(selectedDate, {
        extraIsoDays,
      }),
    [anchorMs, extraKey],
  );

  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    const unsub = subscribeAgendaEventsInDateRange(
      bounds.startIso,
      bounds.endIso,
      (ev) => {
        if (!cancelled) {
          setEvents(ev);
          setHydrated(true);
        }
      },
      () => {
        if (!cancelled) setHydrated(true);
      },
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, [bounds.startIso, bounds.endIso]);

  return { events, hydrated };
}

/**
 * Combina resultado da vista com um único card fora da janela (ex.: `?event=id`).
 */
export async function mergeAgendaHighlightIfNeeded(
  current: AgendaEvent[],
  highlightId: string | null,
): Promise<AgendaEvent[]> {
  if (!highlightId) return current;
  if (current.some((e) => String(e.id) === String(highlightId))) {
    return current;
  }
  const n = Number.parseInt(String(highlightId), 10);
  if (!Number.isFinite(n)) return current;
  const one = await fetchAgendaEventByNumericId(n);
  if (!one) return current;
  return [...current, one].sort(sortEv);
}
