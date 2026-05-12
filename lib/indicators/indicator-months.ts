import type { AgendaEvent } from "@/data/agenda-events";
import type { FollowerHistoryRow } from "@/data/social-followers";
import type { SocialPost } from "@/data/social-posts";
import {
  isIndicadoresAgendaEvent,
  isValidIsoDate,
} from "@/lib/indicators/communication-stats";

export function ymToPtLabel(ym: string): string {
  const parts = ym.split("-").map(Number);
  const y = parts[0]!;
  const mo = parts[1]!;
  const d = new Date(y, mo - 1, 1);
  const raw = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Meses (YYYY-MM) que têm dados relevantes para Indicadores, mais recente primeiro. */
export function collectIndicatorMonthsWithData(
  events: AgendaEvent[],
  posts: SocialPost[],
  historyRows: FollowerHistoryRow[],
): { value: string; label: string }[] {
  const set = new Set<string>();
  for (const e of events) {
    if (!isIndicadoresAgendaEvent(e) || e.status !== "concluido") continue;
    if (!isValidIsoDate(e.date)) continue;
    set.add(e.date.slice(0, 7));
  }
  for (const p of posts) {
    if (!isValidIsoDate(p.date)) continue;
    set.add(p.date.slice(0, 7));
  }
  for (const h of historyRows) {
    if (h.yearMonth && /^\d{4}-\d{2}$/.test(h.yearMonth)) set.add(h.yearMonth);
  }
  const sorted = [...set].sort((a, b) => b.localeCompare(a));
  return sorted.map((value) => ({ value, label: ymToPtLabel(value) }));
}
