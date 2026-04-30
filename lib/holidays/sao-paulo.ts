import { addDays, format } from "date-fns";
import { getEasterSundayGregorian } from "./easter";

export type HolidayEntry = {
  date: string;
  name: string;
  source: "national" | "sp";
};

export type BrasilApiHoliday = { date: string; name: string; type?: string };

function corpusChristiIso(year: number): string {
  const easter = getEasterSundayGregorian(year);
  return format(addDays(easter, 60), "yyyy-MM-dd");
}

function saoPauloMunicipalExtras(year: number): HolidayEntry[] {
  const corpus = corpusChristiIso(year);
  return [
    {
      date: `${year}-01-25`,
      name: "Aniversário da cidade de São Paulo",
      source: "sp",
    },
    {
      date: corpus,
      name: "Corpus Christi",
      source: "sp",
    },
    {
      date: `${year}-07-09`,
      name: "Revolução Constitucionalista de 1932",
      source: "sp",
    },
  ];
}

/** Nacional API + municipal SP (mesma data não duplica; prioriza entrada nacional). */
export function mergeBrasilApiWithSp(
  year: number,
  national: BrasilApiHoliday[],
): HolidayEntry[] {
  const byDate = new Map<string, HolidayEntry>();

  for (const h of national) {
    if (!h?.date) continue;
    byDate.set(h.date, {
      date: h.date,
      name: h.name,
      source: "national",
    });
  }

  for (const h of saoPauloMunicipalExtras(year)) {
    if (!byDate.has(h.date)) {
      byDate.set(h.date, h);
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function holidaysInMonth(
  all: HolidayEntry[],
  year: number,
  monthIndex0: number,
): HolidayEntry[] {
  const mm = String(monthIndex0 + 1).padStart(2, "0");
  const prefix = `${year}-${mm}`;
  return all.filter((h) => h.date.startsWith(prefix)).sort((a, b) => a.date.localeCompare(b.date));
}
