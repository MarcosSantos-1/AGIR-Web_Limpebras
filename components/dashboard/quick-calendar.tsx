"use client";

import type { HolidayEntry } from "@/lib/holidays/sao-paulo";
import { holidaysInMonth } from "@/lib/holidays/sao-paulo";
import { getTodayIsoInTimeZone } from "@/lib/date/week";
import { motion } from "framer-motion";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getMonth,
  getYear,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  endOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/** Cabeçalhos alinhados a `startOfWeek(..., { weekStartsOn: 1 })` (segunda → domingo). */
const weekDaysShort = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function QuickCalendar() {
  const [monthAnchor, setMonthAnchor] = useState(() =>
    startOfMonth(new Date()),
  );
  const [holidays, setHolidays] = useState<HolidayEntry[]>([]);

  const year = getYear(monthAnchor);
  const monthIndex = getMonth(monthAnchor);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/holidays/${year}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: HolidayEntry[]) => {
        if (!cancelled) {
          setHolidays(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!cancelled) setHolidays([]);
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  const holidayDates = useMemo(() => new Set(holidays.map((h) => h.date)), [
    holidays,
  ]);

  const todaySp = getTodayIsoInTimeZone();

  const calendarDays = useMemo(() => {
    const first = startOfMonth(monthAnchor);
    const calStart = startOfWeek(first, { weekStartsOn: 1 });
    const monthEnd = endOfMonth(monthAnchor);
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [monthAnchor]);

  const monthHolidays = useMemo(
    () => holidaysInMonth(holidays, year, monthIndex),
    [holidays, year, monthIndex],
  );

  const title = capitalizeFirst(
    format(monthAnchor, "MMMM yyyy", { locale: ptBR }),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-3xl bg-white p-5 shadow-lg shadow-zinc-200/50"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => setMonthAnchor((m) => startOfMonth(subMonths(m, 1)))}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() => setMonthAnchor((m) => startOfMonth(addMonths(m, 1)))}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDaysShort.map((day, index) => (
          <div
            key={`h-${index}`}
            className="flex h-8 items-center justify-center text-xs font-medium text-zinc-400"
          >
            {day}
          </div>
        ))}
        {calendarDays.map((cellDate, index) => {
          const iso = format(cellDate, "yyyy-MM-dd");
          const currentMonth = isSameMonth(cellDate, monthAnchor);
          const isToday = iso === todaySp;
          const holiday = holidayDates.has(iso);

          return (
            <button
              type="button"
              key={`${iso}-${index}`}
              aria-label={`Dia ${format(cellDate, "d", { locale: ptBR })}`}
              className={`relative flex h-8 w-full items-center justify-center rounded-lg text-sm transition-colors ${
                isToday
                  ? "bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] font-semibold text-white"
                  : currentMonth
                    ? "text-zinc-700 hover:bg-zinc-100"
                    : "text-zinc-300"
              }`}
            >
              {format(cellDate, "d")}
              {holiday && !isToday && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#f318e3]" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium uppercase text-zinc-400">
          Feriados (nacional e São Paulo)
        </p>
        {monthHolidays.length === 0 ? (
          <p className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-500">
            Nenhum feriado neste mês.
          </p>
        ) : (
          <ul className="space-y-2">
            {monthHolidays.map((h) => (
              <li
                key={h.date + h.name}
                className="rounded-xl bg-gradient-to-r from-[#f318e3]/5 to-[#6a0eaf]/5 p-3"
              >
                <p className="text-sm font-medium text-zinc-900">{h.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {new Date(`${h.date}T12:00:00`).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
