"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const days = ["D", "S", "T", "Q", "Q", "S", "S"];
const dates = [
  { day: 30, currentMonth: false },
  { day: 31, currentMonth: false },
  { day: 1, currentMonth: true },
  { day: 2, currentMonth: true },
  { day: 3, currentMonth: true },
  { day: 4, currentMonth: true },
  { day: 5, currentMonth: true },
  { day: 6, currentMonth: true },
  { day: 7, currentMonth: true },
  { day: 8, currentMonth: true },
  { day: 9, currentMonth: true },
  { day: 10, currentMonth: true },
  { day: 11, currentMonth: true },
  { day: 12, currentMonth: true },
  { day: 13, currentMonth: true },
  { day: 14, currentMonth: true, hasEvent: true },
  { day: 15, currentMonth: true },
  { day: 16, currentMonth: true },
  { day: 17, currentMonth: true },
  { day: 18, currentMonth: true, hasEvent: true },
  { day: 19, currentMonth: true },
  { day: 20, currentMonth: true },
  { day: 21, currentMonth: true, isToday: true },
  { day: 22, currentMonth: true, hasEvent: true },
  { day: 23, currentMonth: true },
  { day: 24, currentMonth: true, hasEvent: true },
  { day: 25, currentMonth: true },
  { day: 26, currentMonth: true },
  { day: 27, currentMonth: true },
  { day: 28, currentMonth: true },
  { day: 29, currentMonth: true },
  { day: 30, currentMonth: true },
  { day: 1, currentMonth: false },
  { day: 2, currentMonth: false },
  { day: 3, currentMonth: false },
];

export function QuickCalendar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-3xl bg-white p-5 shadow-lg shadow-zinc-200/50"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900">Abril 2025</h3>
        <div className="flex gap-1">
          <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div
            key={index}
            className="flex h-8 items-center justify-center text-xs font-medium text-zinc-400"
          >
            {day}
          </div>
        ))}
        {dates.map((date, index) => (
          <button
            key={index}
            className={`relative flex h-8 w-full items-center justify-center rounded-lg text-sm transition-colors ${
              date.isToday
                ? "bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] font-semibold text-white"
                : date.currentMonth
                ? "text-zinc-700 hover:bg-zinc-100"
                : "text-zinc-300"
            }`}
          >
            {date.day}
            {date.hasEvent && !date.isToday && (
              <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#f318e3]" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium uppercase text-zinc-400">Próximos eventos</p>
        <div className="rounded-xl bg-gradient-to-r from-[#f318e3]/5 to-[#6a0eaf]/5 p-3">
          <p className="text-sm font-medium text-zinc-900">Revitalização R. das Flores</p>
          <p className="text-xs text-zinc-500">22 Abr • 08:00 - 12:00</p>
        </div>
      </div>
    </motion.div>
  );
}
