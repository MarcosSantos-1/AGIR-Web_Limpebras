"use client";

import { useAgendaEvents } from "@/contexts/agenda-events-context";
import {
  agendaEventUrl,
  agendaListUrl,
  getHomePendingActionVisits,
} from "@/data/agenda-events";
import { getCurrentWeekMondayIso } from "@/lib/date/week";
import { motion } from "framer-motion";
import { MapPin, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

const priorityConfig = {
  high: { label: "Alta", color: "bg-red-100 text-red-700" },
  medium: { label: "Média", color: "bg-amber-100 text-amber-700" },
  low: { label: "Normal", color: "bg-emerald-100 text-emerald-700" },
};

export function ImportantVisits() {
  const { events } = useAgendaEvents();
  const weekStartIso = getCurrentWeekMondayIso();
  const items = getHomePendingActionVisits(events, weekStartIso);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50"
    >
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900">Ações / Visitas</h3>
        <Link
          href={agendaListUrl(weekStartIso)}
          className="flex items-center gap-1 text-sm font-medium text-[#9b0ba6] hover:underline"
        >
          Ver todas
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-zinc-500">
            Nenhuma ação pendente nesta semana.
          </p>
        )}
        {items.map((visit) => {
          const priority = priorityConfig[visit.priority];
          return (
            <Link
              key={visit.id}
              href={agendaEventUrl(visit.id, {
                date: visit.date,
                view: "list",
              })}
              scroll={false}
              className="block rounded-2xl border border-zinc-100 p-4 transition-all hover:border-[#f318e3]/20 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-zinc-900">{visit.title}</h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priority.color}`}
                    >
                      {priority.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#9b0ba6]">{visit.typeLabel}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {visit.address}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {visit.time}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
