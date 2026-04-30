/**
 * Calcula `[startIso, endIso]` cobrindo a vista da Agenda (lista filtra ~mês;
 * semana 7 dias; mês usa grid do calendário). Inclui `extraIsoDays`
 * [highlight URL, filtros] antes do padding opcional para não perder registros.
 */

export function yyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${dd}`;
}

function parseYyMmDd(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map((x) => Number.parseInt(x, 10));
  if (
    Number.isNaN(y) ||
    Number.isNaN(m) ||
    Number.isNaN(d) ||
    m < 1 ||
    m > 12
  ) {
    return null;
  }
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return dt;
}

function padRange(
  start: Date,
  end: Date,
  padDays: number,
): { startIso: string; endIso: string } {
  const lo = start.getTime() <= end.getTime() ? start : end;
  const hi = start.getTime() <= end.getTime() ? end : start;
  const s = new Date(lo);
  s.setHours(12, 0, 0, 0);
  s.setDate(s.getDate() - padDays);
  const e = new Date(hi);
  e.setHours(12, 0, 0, 0);
  e.setDate(e.getDate() + padDays);
  return { startIso: yyyyMmDd(s), endIso: yyyyMmDd(e) };
}

/** Domingo antes ou igual ao dia `d` (hora ~meio‑dia anti‑fusos). */
function startSundayWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  const wd = x.getDay();
  x.setDate(x.getDate() - wd);
  return x;
}

function endSaturdayWeek(startSunday: Date): Date {
  const x = new Date(startSunday);
  x.setDate(x.getDate() + 6);
  return x;
}

/** Extremos do grid do calendário mensal (dias fantasmas incluídos). */
function calendarMonthGridBounds(anchor: Date): { start: Date; end: Date } {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const first = new Date(y, m, 1, 12, 0, 0, 0);
  const pad = first.getDay();
  const gridStart = new Date(y, m, 1 - pad, 12, 0, 0, 0);
  const dim = new Date(y, m + 1, 0).getDate();
  const trailing = (7 - ((pad + dim) % 7)) % 7;
  const numCells = pad + dim + trailing;
  const gridEnd = new Date(y, m, (1 - pad) + numCells - 1, 12, 0, 0, 0);
  return { start: gridStart, end: gridEnd };
}

function mergeExtents(
  a: { startIso: string; endIso: string },
  isoDays: string[],
): { startIso: string; endIso: string } {
  let low = parseYyMmDd(a.startIso)?.getTime() ?? Infinity;
  let hi = parseYyMmDd(a.endIso)?.getTime() ?? -Infinity;
  if (Number.isFinite(low) && hi < low) {
    const tmp = low;
    low = hi;
    hi = tmp;
  }
  for (const iso of isoDays) {
    const t = parseYyMmDd(iso)?.getTime();
    if (t != null) {
      low = Math.min(low, t);
      hi = Math.max(hi, t);
    }
  }
  if (!Number.isFinite(low) || !Number.isFinite(hi))
    return a;
  return {
    startIso: yyyyMmDd(new Date(low)),
    endIso: yyyyMmDd(new Date(hi)),
  };
}

/**
 * Intervalo yyyy-MM-dd usado pela query Firestore da página Agenda (+ padding dias).
 */
export function agendaFirestoreRangeForViewport(
  selectedDate: Date,
  viewMode: "week" | "month" | "list",
  opts?: {
    /** event= na URL ou data filtro na lista — sempre incluídos quando válidos */
    extraIsoDays?: Array<string | null | undefined>;
    /** dias antes/de depois dos extremos calculados */
    padDays?: number;
  },
): { startIso: string; endIso: string } {
  const pad = opts?.padDays ?? 7;
  let core: { start: Date; end: Date };
  switch (viewMode) {
    case "week": {
      const ws = startSundayWeek(selectedDate);
      const we = endSaturdayWeek(ws);
      core = { start: ws, end: we };
      break;
    }
    case "month": {
      core = calendarMonthGridBounds(selectedDate);
      break;
    }
    case "list":
    default: {
      const y = selectedDate.getFullYear();
      const m = selectedDate.getMonth();
      core = {
        start: new Date(y, m, 1, 12, 0, 0, 0),
        end: new Date(y, m + 1, 0, 12, 0, 0, 0),
      };
      break;
    }
  }
  const extra = [...(opts?.extraIsoDays ?? [])];
  const base = mergeExtents(
    {
      startIso: yyyyMmDd(core.start),
      endIso: yyyyMmDd(core.end),
    },
    extra.flatMap((x) => (x && /^\d{4}-\d{2}-\d{2}$/.test(x) ? [x] : [])),
  );
  const s = parseYyMmDd(base.startIso);
  const e = parseYyMmDd(base.endIso);
  if (!s || !e) return base;
  return padRange(s, e, pad);
}
