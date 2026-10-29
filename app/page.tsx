"use client";

import { AppShell } from "@/components/layout/app-shell";
import { WeekSummary } from "@/components/dashboard/week-summary";
import { QuickCalendar } from "@/components/dashboard/quick-calendar";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { DailyChecklist } from "@/components/dashboard/daily-checklist";
import { ImportantVisits } from "@/components/dashboard/important-visits";
import { SocialContentSchedule } from "@/components/dashboard/social-content-schedule";
import { formatTodayLongPtBr, getTodayIsoInTimeZone } from "@/lib/date/week";
import { useState } from "react";
// import { StatsCards } from "@/components/dashboard/stats-cards";

export default function DashboardPage() {
  const [checklistDate, setChecklistDate] = useState(() =>
    getTodayIsoInTimeZone(),
  );

  return (
    <AppShell
      title="Home"
      subtitle={formatTodayLongPtBr()}
    >
      {/* Stats Cards (comentado; métricas no painel Indicadores) */}
      {/* <StatsCards /> */}

      {/* Quick Actions */}
      <QuickActions />

      {/* Main Grid */}
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-8">
          <WeekSummary />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ImportantVisits />
            <SocialContentSchedule />
          </div>
        </div>

        <div className="min-w-0 space-y-6 lg:col-span-4">
          <QuickCalendar
            selectedDate={checklistDate}
            onSelectDate={setChecklistDate}
          />
          <DailyChecklist
            selectedDate={checklistDate}
            onGoToday={() => setChecklistDate(getTodayIsoInTimeZone())}
          />
        </div>
      </div>
    </AppShell>
  );
}
