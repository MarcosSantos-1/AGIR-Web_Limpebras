"use client";

import { AgendaEventsProvider } from "@/contexts/agenda-events-context";
import { type ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return <AgendaEventsProvider>{children}</AgendaEventsProvider>;
}
