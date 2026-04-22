"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertCircle, ChevronRight } from "lucide-react";

const weekData = [
  {
    day: "Seg",
    date: "21",
    tasks: [
      { title: "Vistoria Ponto 23", status: "pending", time: "09:00" },
      { title: "Reunião Equipe", status: "done", time: "14:00" },
    ],
  },
  {
    day: "Ter",
    date: "22",
    tasks: [
      { title: "Revitalização R. das Flores", status: "pending", time: "08:00" },
      { title: "Visita UBS Centro", status: "pending", time: "15:00" },
    ],
  },
  {
    day: "Qua",
    date: "23",
    tasks: [
      { title: "Fiscalização Setor B", status: "pending", time: "10:00" },
    ],
  },
  {
    day: "Qui",
    date: "24",
    tasks: [
      { title: "Ação Ambiental Escola", status: "pending", time: "08:30" },
      { title: "Coleta Ponto Crítico", status: "urgent", time: "13:00" },
    ],
  },
  {
    day: "Sex",
    date: "25",
    tasks: [
      { title: "Relatório Semanal", status: "pending", time: "16:00" },
    ],
  },
];

const statusConfig = {
  done: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
  pending: { icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
  urgent: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
};

export function WeekSummary() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Resumo da Semana</h3>
          <p className="text-sm text-zinc-500">21 - 25 de Abril</p>
        </div>
        <button className="flex items-center gap-1 text-sm font-medium text-[#9b0ba6] hover:underline">
          Ver agenda completa
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {weekData.map((day, dayIndex) => (
          <div
            key={day.day}
            className={`rounded-2xl p-4 transition-colors ${
              dayIndex === 0
                ? "bg-gradient-to-br from-[#f318e3]/5 to-[#6a0eaf]/5 ring-2 ring-[#f318e3]/20"
                : "bg-zinc-50 hover:bg-zinc-100"
            }`}
          >
            <div className="mb-3 text-center">
              <p className="text-xs font-medium uppercase text-zinc-400">{day.day}</p>
              <p
                className={`mt-1 text-2xl font-semibold ${
                  dayIndex === 0 ? "text-[#9b0ba6]" : "text-zinc-900"
                }`}
              >
                {day.date}
              </p>
            </div>
            <div className="space-y-2">
              {day.tasks.map((task, taskIndex) => {
                const config = statusConfig[task.status as keyof typeof statusConfig];
                const Icon = config.icon;
                return (
                  <div
                    key={taskIndex}
                    className={`rounded-xl ${config.bg} p-2.5`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className={`mt-0.5 h-3.5 w-3.5 ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-medium text-zinc-700">
                          {task.title}
                        </p>
                        <p className="text-[10px] text-zinc-500">{task.time}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
