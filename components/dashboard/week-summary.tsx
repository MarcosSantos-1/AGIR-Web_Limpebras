"use client";

import {
  agendaEventUrl,
  agendaHomeUrl,
  getHomeWeekSummaryColumns,
  getHomeWeekSummaryRangeLabel,
} from "@/data/agenda-events";
import { useAgendaEvents } from "@/contexts/agenda-events-context";
import { useSocialPosts } from "@/contexts/social-posts-context";
import { getCurrentWeekMondayIso, getTodayIsoInTimeZone } from "@/lib/date/week";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertCircle, Share2, ChevronRight } from "lucide-react";
import Link from "next/link";

const statusConfig = {
  done: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
  pending: { icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
  urgent: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
};

export function WeekSummary() {
  const { events } = useAgendaEvents();
  const { posts } = useSocialPosts();
  const weekStartIso = getCurrentWeekMondayIso();
  const todayIso = getTodayIsoInTimeZone();
  const weekLabel = getHomeWeekSummaryRangeLabel(todayIso, weekStartIso);
  const weekData = getHomeWeekSummaryColumns(todayIso, events, weekStartIso, posts);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Resumo da Semana</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{weekLabel}</p>
        </div>
        <Link
          href={agendaHomeUrl(weekStartIso)}
          className="flex items-center gap-1 text-sm font-medium text-[var(--gradient-accent)] hover:underline"
        >
          Ver agenda completa
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {weekData.map((day) => {
          const isToday = day.iso === todayIso;
          return (
            <div
              key={day.iso}
              className={`rounded-2xl p-4 transition-colors ${
                isToday
                  ? "bg-gradient-to-br from-[var(--gradient-start)]/5 to-[var(--gradient-end)]/5 ring-2 ring-[var(--gradient-start)]/20"
                  : "bg-zinc-50 hover:bg-zinc-100"
              }`}
            >
            <div className="mb-3 text-center">
              <p className="text-xs font-medium uppercase text-zinc-400 dark:text-zinc-500">{day.day}</p>
              <p
                className={`mt-1 text-2xl font-semibold ${
                  isToday ? "text-[var(--gradient-accent)]" : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {day.date}
              </p>
            </div>
            <div className="space-y-2">
              {day.tasks.map((task, taskIndex) => {
                const isSocial = !!task.socialPostId;
                const config = statusConfig[task.status];
                const Icon = isSocial ? Share2 : config.icon;
                const inner = (
                  <div
                    className={`rounded-xl ${
                      isSocial ? "bg-fuchsia-50" : config.bg
                    } p-2.5 ${
                      task.eventId > 0 || isSocial
                        ? "cursor-pointer transition-shadow hover:shadow-md"
                        : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon
                        className={`mt-0.5 h-3.5 w-3.5 ${
                          isSocial ? "text-fuchsia-500" : config.color
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          {task.title}
                        </p>
                        {task.time ? (
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{task.time}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );

                if (isSocial) {
                  return (
                    <Link
                      key={`${day.day}-${taskIndex}`}
                      href={`/redes-sociais?content=${task.socialPostId}`}
                      scroll={false}
                    >
                      {inner}
                    </Link>
                  );
                }

                if (task.eventId > 0) {
                  return (
                    <Link
                      key={`${day.day}-${taskIndex}`}
                      href={agendaEventUrl(task.eventId, {
                        date: day.iso,
                        view: "list",
                      })}
                      scroll={false}
                    >
                      {inner}
                    </Link>
                  );
                }

                return <div key={`${day.day}-${taskIndex}`}>{inner}</div>;
              })}
            </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
