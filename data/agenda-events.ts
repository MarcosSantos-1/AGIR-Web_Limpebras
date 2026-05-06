/**
 * Lista de seed legada (dev / fallbacks). Produção usa eventos do Firestore via
 * `useAgendaEvents()`. `DASHBOARD_AGENDA` permanece como fallback de testes.
 */

import {
  formatDashboardWeekWindowLabel,
  getCurrentWeekMondayIso,
  getHomeWeekSummaryMondayOffset,
  parseYmdLocal,
} from "@/lib/date/week";
import { addDays, format, getISODay } from "date-fns";
import type { SubregionalId } from "@/lib/constants/subregionais";

export const DASHBOARD_AGENDA = {
  weekStartIso: "2026-04-21",
  weekLabel: "21 - 25 de Abril de 2026",
} as const;

export type AgendaEventType =
  | "revitalizacao"
  | "visita-tecnica"
  | "visita-institucional"
  | "acao-ambiental"
  | "reuniao"
  | "fiscalizacao"
  | "vistoria"
  | "panfletagem";

export type AgendaEventStatus = "pendente" | "concluido" | "reagendado" | "cancelado";

export type AgendaEvent = {
  id: number;
  title: string;
  type: AgendaEventType;
  status: AgendaEventStatus;
  responsible: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  /** Subregional territorial (indicadores / distribuição). */
  subregional?: SubregionalId;
  priority: "high" | "medium" | "low";
  observations: string;
  equipe?: string;
  /** Ordem da equipa no terreno (modais). */
  equipeIntegrantes?: string[];
  panfletosDistribuidos?: number;
  locaisAtendidos?: string;
  fotosTiradas?: number;
  linksPostagem?: string[];
  /** Preenchido ao concluir (persistido localmente) */
  completionDescription?: string;
  completionPhotoDataUrls?: string[];
};

export const agendaEvents: AgendaEvent[] = [
  {
    id: 1,
    title: "Revitalização Praça Central",
    type: "revitalizacao",
    status: "pendente",
    responsible: "Igor Supervisor",
    date: "2026-04-21",
    time: "08:00",
    endTime: "12:00",
    location: "Praça da República, Centro",
    priority: "high",
    observations: "Levar equipamentos de jardinagem",
  },
  {
    id: 2,
    title: "Visita Técnica Ecoponto",
    type: "visita-tecnica",
    status: "pendente",
    responsible: "Maria",
    date: "2026-04-21",
    time: "14:00",
    endTime: "16:00",
    location: "Ecoponto Zona Norte",
    priority: "medium",
    observations: "",
  },
  {
    id: 3,
    title: "Reunião de Equipe Semanal",
    type: "reuniao",
    status: "concluido",
    responsible: "Igor Supervisor",
    date: "2026-04-21",
    time: "17:00",
    endTime: "18:00",
    location: "Sala de Reuniões",
    priority: "low",
    observations: "Pauta: planejamento mensal",
  },
  {
    id: 4,
    title: "Fiscalização Setor Industrial",
    type: "fiscalizacao",
    status: "pendente",
    responsible: "Luciana",
    date: "2026-04-22",
    time: "09:00",
    endTime: "11:00",
    location: "R. Industrial, 500-800",
    priority: "high",
    observations: "Denúncia de descarte irregular",
  },
  {
    id: 5,
    title: "Ação Ambiental Escola",
    type: "acao-ambiental",
    status: "pendente",
    responsible: "Maria",
    date: "2026-04-22",
    time: "13:00",
    endTime: "16:00",
    location: "Escola Mun. Nova Esperança",
    priority: "medium",
    observations: "Palestra sobre reciclagem",
  },
  {
    id: 6,
    title: "Panfletagem — Conscientização Ecoponto",
    type: "panfletagem",
    status: "pendente",
    responsible: "Igor Supervisor",
    date: "2026-04-23",
    time: "08:00",
    endTime: "12:00",
    location: "Praça da República e entorno",
    priority: "medium",
    observations: "Material extra no veículo 02.",
    equipe: "Equipe Comunicação + 2 voluntários",
    panfletosDistribuidos: 850,
    locaisAtendidos: "Praça da República, Feira livre, UBS Centro",
    fotosTiradas: 24,
    linksPostagem: ["https://instagram.com", "https://facebook.com"],
  },
  {
    id: 7,
    title: "Panfletagem — Bairro Jardim",
    type: "panfletagem",
    status: "pendente",
    responsible: "Maria",
    date: "2026-04-24",
    time: "14:00",
    endTime: "17:30",
    location: "Rua das Flores, Escola Mun. Jardim",
    priority: "low",
    observations: "",
    equipe: "Maria, Luciana",
    panfletosDistribuidos: 420,
    locaisAtendidos: "Escola Mun. Jardim, comércio local (8 estabelecimentos)",
    fotosTiradas: 12,
    linksPostagem: [],
  },
  {
    id: 8,
    title: "Visita Institucional — Conselho Tutelar",
    type: "visita-institucional",
    status: "pendente",
    responsible: "Luciana",
    date: "2026-04-23",
    time: "15:00",
    endTime: "16:30",
    location: "Conselho Tutelar — Centro",
    priority: "medium",
    observations: "Alinhamento do calendário de ações comunitárias.",
  },
  {
    id: 9,
    title: "Vistoria — Ponto de entulho provisório",
    type: "vistoria",
    status: "pendente",
    responsible: "Igor Supervisor",
    date: "2026-04-25",
    time: "10:00",
    endTime: "11:30",
    location: "R. Industrial, trecho 200–300",
    priority: "high",
    observations: "Verificar cumprimento de prazo do Município.",
  },
];

export function getAgendaEventById(
  id: string | number,
): AgendaEvent | undefined {
  return agendaEvents.find((e) => String(e.id) === String(id));
}

export type DashboardActionVisit = {
  id: number;
  title: string;
  typeLabel: string;
  address: string;
  time: string;
  date: string;
  priority: "high" | "medium" | "low";
};

/** Home → todas as ações pendentes da semana (Seg–Sex), em ordem cronológica. */
export function getHomePendingActionVisits(
  events: AgendaEvent[],
  weekStartIso: string = getCurrentWeekMondayIso(),
): DashboardActionVisit[] {
  const start = new Date(weekStartIso + "T12:00:00");
  const weekDayIsos: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    weekDayIsos.push(d.toISOString().split("T")[0]);
  }
  return events
    .filter(
      (e) => weekDayIsos.includes(e.date) && e.status === "pendente",
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    )
    .map((e) => ({
      id: e.id,
      title: e.title,
      typeLabel: typeToShortLabel(e.type),
      address: e.location,
      time: e.time,
      date: e.date,
      priority: e.priority,
    }));
}

function typeToShortLabel(type: AgendaEventType): string {
  const map: Record<AgendaEventType, string> = {
    revitalizacao: "Revitalização",
    "visita-tecnica": "Visita Técnica",
    "visita-institucional": "Visita Institucional",
    "acao-ambiental": "Ação Ambiental",
    reuniao: "Reunião",
    fiscalizacao: "Fiscalização",
    vistoria: "Vistoria",
    panfletagem: "Panfletagem",
  };
  return map[type] ?? type;
}

type WeekTaskStatus = "done" | "pending" | "urgent";

type WeekTask = {
  title: string;
  status: WeekTaskStatus;
  time: string;
  eventId: number;
};

export type WeekSummaryColumn = {
  day: string;
  /** Dia do mês (número como string) */
  date: string;
  /** yyyy-MM-dd para links e comparações */
  iso: string;
  tasks: WeekTask[];
};

function eventToTaskStatus(e: AgendaEvent): WeekTaskStatus {
  if (e.status === "concluido") return "done";
  if (e.priority === "high") return "urgent";
  return "pending";
}

/** Colunas Seg–Sex para o card “Resumo da Semana”. */
export function getWeekSummaryColumns(
  weekStartIso: string = getCurrentWeekMondayIso(),
  sourceEvents: AgendaEvent[] = agendaEvents,
): WeekSummaryColumn[] {
  const start = new Date(weekStartIso + "T12:00:00");
  const dayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex"] as const;
  const columns: WeekSummaryColumn[] = [];

  for (let i = 0; i < 5; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    const dayEvents = sourceEvents
      .filter((e) => e.date === iso)
      .sort((a, b) => a.time.localeCompare(b.time));
    const tasks: WeekTask[] = dayEvents.map((e) => ({
      title: e.title,
      status: eventToTaskStatus(e),
      time: e.time,
      eventId: e.id,
    }));

    columns.push({
      day: dayLabels[i],
      date: String(d.getDate()),
      iso,
      tasks,
    });
  }

  return columns;
}

const HOME_WEEK_SUMMARY_WEEKDAY_SHORT = [
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
  "Dom",
] as const;

/** Cinco dias visíveis no Home: seg–sex até quarta; depois inclui fim de semana deslocando o início. */
export function getHomeWeekSummaryColumns(
  todayIso: string,
  sourceEvents: AgendaEvent[] = agendaEvents,
  weekStartIso: string = getCurrentWeekMondayIso(),
): WeekSummaryColumn[] {
  const monday = parseYmdLocal(weekStartIso);
  const offset = getHomeWeekSummaryMondayOffset(todayIso);
  const columns: WeekSummaryColumn[] = [];

  for (let i = 0; i < 5; i++) {
    const d = addDays(monday, offset + i);
    const iso = format(d, "yyyy-MM-dd");
    const isoDow = getISODay(d);
    const day = HOME_WEEK_SUMMARY_WEEKDAY_SHORT[isoDow - 1];
    const dayEvents = sourceEvents
      .filter((e) => e.date === iso)
      .sort((a, b) => a.time.localeCompare(b.time));
    const tasks: WeekTask[] = dayEvents.map((e) => ({
      title: e.title,
      status: eventToTaskStatus(e),
      time: e.time,
      eventId: e.id,
    }));

    columns.push({
      day,
      date: String(d.getDate()),
      iso,
      tasks,
    });
  }

  return columns;
}

export function getHomeWeekSummaryRangeLabel(
  todayIso: string,
  weekStartIso: string = getCurrentWeekMondayIso(),
): string {
  const monday = parseYmdLocal(weekStartIso);
  const offset = getHomeWeekSummaryMondayOffset(todayIso);
  const first = addDays(monday, offset);
  const last = addDays(monday, offset + 4);
  return formatDashboardWeekWindowLabel(
    format(first, "yyyy-MM-dd"),
    format(last, "yyyy-MM-dd"),
  );
}

export function agendaEventUrl(
  eventId: string | number,
  options?: { date?: string; view?: "week" | "month" | "list" },
) {
  const p = new URLSearchParams();
  p.set("event", String(eventId));
  if (options?.date) p.set("date", options.date);
  if (options?.view) p.set("view", options.view);
  return `/agenda?${p.toString()}`;
}

export function agendaHomeUrl(weekStartIso: string = getCurrentWeekMondayIso()) {
  return `/agenda?date=${weekStartIso}&view=week`;
}

export function agendaListUrl(weekStartIso: string = getCurrentWeekMondayIso()) {
  return `/agenda?date=${weekStartIso}&view=list`;
}
