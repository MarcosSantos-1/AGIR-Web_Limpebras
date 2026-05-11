import type { AgendaEvent } from "@/data/agenda-events";
import { formatDateBr } from "@/lib/utils";

/** Documents without a specific clock use this sentinel in Firestore (`time` and `endTime`). */
export const AGENDA_TIME_UNSPECIFIED = "--";

/** Data no calendário BR + horário quando existir (ex.: 11/05/2026 · 08:00–12:00). */
export function formatAgendaDateTimeBr(
  ev: Pick<AgendaEvent, "date" | "time" | "endTime">,
): string {
  const d = formatDateBr(ev.date);
  const t = ev.time?.trim() ?? "";
  const u = ev.endTime?.trim() ?? "";
  if (
    !t ||
    !u ||
    t === AGENDA_TIME_UNSPECIFIED ||
    u === AGENDA_TIME_UNSPECIFIED
  ) {
    return d;
  }
  const timePart = t === u ? t : `${t} – ${u}`;
  return `${d} · ${timePart}`;
}

export function agendaClockLabel(event: AgendaEvent): string {
  const t = event.time?.trim() ?? "";
  const u = event.endTime?.trim() ?? "";
  if (
    !t ||
    !u ||
    t === AGENDA_TIME_UNSPECIFIED ||
    u === AGENDA_TIME_UNSPECIFIED
  ) {
    return "Sem horário definido";
  }
  if (t === u) return t;
  return `${t} – ${u}`;
}
