"use client";

import { motion } from "framer-motion";
import {
  Activity,
  MapPin,
  RefreshCcw,
  AlertTriangle,
  Clock,
} from "lucide-react";

const stats = [
  {
    label: "Ações da Semana",
    value: "12",
    change: "+3 vs semana anterior",
    icon: Activity,
    trend: "up",
  },
  {
    label: "Pontos Ativos",
    value: "47",
    change: "8 novos este mês",
    icon: MapPin,
    trend: "neutral",
  },
  {
    label: "Revitalizações",
    value: "5",
    change: "2 em andamento",
    icon: RefreshCcw,
    trend: "up",
  },
  {
    label: "Reincidências",
    value: "3",
    change: "1 crítica",
    icon: AlertTriangle,
    trend: "down",
  },
  {
    label: "Pendências",
    value: "8",
    change: "2 urgentes",
    icon: Clock,
    trend: "warning",
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-5 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg shadow-zinc-200/50 transition-all hover:shadow-xl"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
                {stat.value}
              </p>
              <p
                className={`mt-1 text-xs ${
                  stat.trend === "up"
                    ? "text-emerald-600"
                    : stat.trend === "down"
                    ? "text-red-500"
                    : stat.trend === "warning"
                    ? "text-amber-600"
                    : "text-zinc-500"
                }`}
              >
                {stat.change}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#f318e3]/10 to-[#6a0eaf]/10">
              <stat.icon className="h-5 w-5 text-[#9b0ba6]" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] opacity-0 transition-opacity group-hover:opacity-100" />
        </motion.div>
      ))}
    </div>
  );
}
