import { addDays, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

const SP_TZ = "America/Sao_Paulo";

/** Calendar date yyyy-MM-dd for "now" in São Paulo (no time component). */
export function getTodayIsoInTimeZone(timeZone = SP_TZ): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) return format(new Date(), "yyyy-MM-dd");
  return `${y}-${m}-${d}`;
}

function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Monday (Seg) of the week containing the given calendar day. */
export function getWeekMondayFromDayIso(dayIso: string): Date {
  const day = parseYmdLocal(dayIso);
  return startOfWeek(day, { weekStartsOn: 1 });
}

/** Monday–Friday week start ISO for the current week in São Paulo. */
export function getCurrentWeekMondayIso(timeZone = SP_TZ): string {
  const today = parseYmdLocal(getTodayIsoInTimeZone(timeZone));
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}

/**
 * Label like "21 – 25 de abril de 2026" for the Mon–Fri segment.
 */
export function formatDashboardWeekRangeLabel(mondayIso: string): string {
  const monday = parseYmdLocal(mondayIso);
  const friday = addDays(monday, 4);
  const sameMonth = monday.getMonth() === friday.getMonth();
  if (sameMonth) {
    return `${format(monday, "d")} – ${format(friday, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
  }
  return `${format(monday, "d 'de' MMMM", { locale: ptBR })} – ${format(friday, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
}

/** e.g. "Segunda-feira, 29 de abril de 2026" — date in São Paulo */
export function formatTodayLongPtBr(timeZone = SP_TZ): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}
