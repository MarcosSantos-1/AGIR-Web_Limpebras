"use client";

import type { HolidayEntry } from "@/lib/holidays/sao-paulo";
import { holidaysInMonth } from "@/lib/holidays/sao-paulo";
import { getTodayIsoInTimeZone } from "@/lib/date/week";
import type { DailyChecklistDayItem } from "@/lib/checklist-types";
import { subscribeDailyChecklistAllDays } from "@/lib/firestore/checklist";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getMonth,
  getYear,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
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

/** Verde = 100%. Vermelho = houve pelo menos um check mas não está completo. Sem marcador = sem itens ou nenhum feito. */
function checklistDayMarker(
  items: readonly DailyChecklistDayItem[],
): "complete" | "partial" | "none" {
  const n = items.length;
  if (n === 0) return "none";
  let done = 0;
  for (const it of items) {
    if (it.done) done += 1;
  }
  if (done === n) return "complete";
  if (done === 0) return "none";
  return "partial";
}

export type QuickCalendarProps = {
  /** yyyy-MM-dd — dia ligado ao checklist (opcional). */
  selectedDate?: string;
  onSelectDate?: (isoDate: string) => void;
};

export function QuickCalendar({
  selectedDate,
  onSelectDate,
}: QuickCalendarProps) {
  const { user } = useAuth();
  const uid = user?.uid;

  const [monthAnchor, setMonthAnchor] = useState(() =>
    startOfMonth(new Date()),
  );
  const [holidays, setHolidays] = useState<HolidayEntry[]>([]);
  const [itemsByDay, setItemsByDay] = useState<
    Map<string, DailyChecklistDayItem[]>
  >(() => new Map());

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

  useEffect(() => {
    if (!uid) {
      setItemsByDay(new Map());
      return;
    }
    return subscribeDailyChecklistAllDays(uid, setItemsByDay);
  }, [uid]);

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

  useEffect(() => {
    if (!selectedDate) return;
    const d = parseISO(`${selectedDate}T12:00:00`);
    setMonthAnchor((m) => (isSameMonth(d, m) ? m : startOfMonth(d)));
  }, [selectedDate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-card dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
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
            className="flex h-8 items-center justify-center text-xs font-medium text-zinc-400 dark:text-zinc-500"
          >
            {day}
          </div>
        ))}
        {calendarDays.map((cellDate, index) => {
          const iso = format(cellDate, "yyyy-MM-dd");
          const currentMonth = isSameMonth(cellDate, monthAnchor);
          const isToday = iso === todaySp;
          const holiday = holidayDates.has(iso);

          const isSelected =
            selectedDate != null && iso === selectedDate && !isToday;

          const chk = checklistDayMarker(itemsByDay.get(iso) ?? []);

          const checklistLabel =
            chk === "complete"
              ? "Checklist concluído (100%). "
              : chk === "partial"
                ? "Checklist em andamento. "
                : "";

          return (
            <button
              type="button"
              key={`${iso}-${index}`}
              aria-current={iso === selectedDate ? "date" : undefined}
              aria-label={`${checklistLabel}Dia ${format(cellDate, "d", { locale: ptBR })}${holiday ? ", feriado" : ""}`}
              onClick={() => onSelectDate?.(iso)}
              className={cn(
                "relative flex h-9 w-full flex-col items-center justify-center rounded-lg text-sm transition-colors",
                isToday
                  ? "bg-accent-gradient font-semibold text-white ring-2 ring-[var(--gradient-start)]/40 ring-offset-1 ring-offset-white"
                  : isSelected
                    ? "bg-fuchsia-50 font-semibold text-zinc-900 ring-2 ring-[var(--gradient-accent)]/70"
                    : currentMonth
                      ? "text-zinc-700 hover:bg-zinc-100"
                      : "text-zinc-300",
              )}
            >
              <span
                className={cn(
                  "leading-none",
                  holiday && !isToday && "font-bold text-red-600",
                  holiday && isToday && "font-bold text-white",
                )}
              >
                {format(cellDate, "d")}
              </span>
              {chk === "complete" ? (
                <span
                  className="absolute bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-emerald-500 shadow-sm ring-1 ring-white/80"
                  title="Checklist 100%"
                  aria-hidden
                />
              ) : chk === "partial" ? (
                <span
                  className="absolute bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-red-500 shadow-sm ring-1 ring-white/80"
                  title="Checklist iniciado e incompleto"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium uppercase text-zinc-400 dark:text-zinc-500">
          Feriados (nacional e São Paulo)
        </p>
        {monthHolidays.length === 0 ? (
          <p className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">
            Nenhum feriado neste mês.
          </p>
        ) : (
          <ul className="space-y-2">
            {monthHolidays.map((h) => (
              <li
                key={h.date + h.name}
                className="rounded-xl bg-gradient-to-r from-[var(--gradient-start)]/5 to-[var(--gradient-end)]/5 p-3"
              >
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{h.name}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">
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
