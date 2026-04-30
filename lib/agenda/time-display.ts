import type { AgendaEvent } from "@/data/agenda-events";

/** Documents without a specific clock use this sentinel in Firestore (`time` and `endTime`). */
export const AGENDA_TIME_UNSPECIFIED = "--";

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
