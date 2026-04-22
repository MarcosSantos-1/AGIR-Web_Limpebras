"use client";

import { AppShell } from "@/components/layout/app-shell";
import { WeekSummary } from "@/components/dashboard/week-summary";
import { QuickCalendar } from "@/components/dashboard/quick-calendar";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { DailyChecklist } from "@/components/dashboard/daily-checklist";
import { ImportantVisits } from "@/components/dashboard/important-visits";
import { SocialContentSchedule } from "@/components/dashboard/social-content-schedule";
// import { StatsCards } from "@/components/dashboard/stats-cards";

export default function DashboardPage() {
  return (
    <AppShell
      title="Home"
      subtitle="Segunda-feira, 21 de Abril de 2025"
    >
      {/* Stats Cards (comentado; métricas no painel Indicadores) */}
      {/* <StatsCards /> */}

      {/* Quick Actions */}
      <QuickActions />

      {/* Main Grid */}
      <div className="mt-4 grid grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="col-span-8 space-y-6">
          <WeekSummary />
          <div className="grid grid-cols-2 gap-6">
            <ImportantVisits />
            <SocialContentSchedule />
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-4 space-y-6">
          <QuickCalendar />
          <DailyChecklist />
        </div>
      </div>
    </AppShell>
  );
}
