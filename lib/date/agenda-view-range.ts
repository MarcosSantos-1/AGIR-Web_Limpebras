/**
 * Intervalos yyyy-MM-dd para queries Firestore.
 * Vista Agenda usa um único envelope de mês civil (menos dados) + dias extras opcionais.
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

/** `yyyy-MM` ou `yyyy-MM-dd` → primeiro dia do mês (meio-dia anti-fuso). */
export function anchorDateFromYearMonthYm(s: string): Date | null {
  const trimmed = s.trim();
  const ym = /^(\d{4})-(\d{2})$/.exec(trimmed);
  if (ym) {
    const y = Number(ym[1]);
    const m = Number(ym[2]);
    if (
      Number.isFinite(y) &&
      Number.isFinite(m) &&
      m >= 1 &&
      m <= 12
    ) {
      return new Date(y, m - 1, 1, 12, 0, 0, 0);
    }
    return null;
  }
  const d = parseYyMmDd(trimmed);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0);
}

/**
 * Mês civil (inclusive), sem padding. Mescla datas extras (`?event=` etc.).
 */
export function calendarMonthFirestoreRange(
  anchor: Date,
  opts?: { extraIsoDays?: Array<string | null | undefined> },
): { startIso: string; endIso: string } {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const core = {
    startIso: yyyyMmDd(new Date(y, m, 1, 12, 0, 0, 0)),
    endIso: yyyyMmDd(new Date(y, m + 1, 0, 12, 0, 0, 0)),
  };
  const extras = [...(opts?.extraIsoDays ?? [])].flatMap((x) =>
    typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.trim()) ? [x.trim()] : [],
  );
  return mergeExtents(core, extras);
}
