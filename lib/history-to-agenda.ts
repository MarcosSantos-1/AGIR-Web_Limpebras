import type {
  AgendaEvent,
  AgendaEventStatus,
  AgendaEventType,
} from "@/data/agenda-events";
import type { HistoryRecordDoc } from "@/data/history-records";
import { AGENDA_TIME_UNSPECIFIED } from "@/lib/agenda/time-display";
import { isSubregionalId } from "@/lib/constants/subregionais";
import { splitHistoryTime } from "@/lib/history-persist";

const agendaTypes: AgendaEventType[] = [
  "revitalizacao",
  "visita-tecnica",
  "visita-institucional",
  "acao-ambiental",
  "reuniao",
  "fiscalizacao",
  "vistoria",
  "panfletagem",
];

function coerceHistoryTypeToAgenda(t: string): AgendaEventType {
  if (agendaTypes.includes(t as AgendaEventType)) return t as AgendaEventType;
  const alias: Record<string, AgendaEventType> = {
    limpeza: "acao-ambiental",
  };
  return alias[t] ?? "acao-ambiental";
}

function historyStatusToAgenda(s: string): AgendaEventStatus {
  if (s === "cancelado") return "cancelado";
  if (s === "reagendado") return "reagendado";
  if (s === "concluido" || s === "parcial") return "concluido";
  return "pendente";
}

/**
 * Constrói um `AgendaEvent` a partir de um registro de histórico, para reabrir nos modais
 * de Nova Ação / Revitalização quando não houver (ainda) documento em `agendaEvents`.
 */
export function historyRecordDocToAgendaEvent(r: HistoryRecordDoc): AgendaEvent {
  const { start, end } = splitHistoryTime(r.time);
  const tStart =
    start.trim() !== "" ? start.trim() : AGENDA_TIME_UNSPECIFIED;
  const tEnd = end.trim() !== "" ? end.trim() : tStart;
  const agendaStatus = historyStatusToAgenda(r.status);

  const extra = r.extraPhotoUrls ?? [];
  const event: AgendaEvent = {
    id: r.id,
    title: r.title,
    type: coerceHistoryTypeToAgenda(r.type),
    status: agendaStatus,
    responsible: r.responsible?.trim() ? r.responsible.trim() : "—",
    date: r.date,
    time: tStart,
    endTime: tEnd,
    location: r.location,
    priority: agendaStatus === "concluido" ? "high" : "medium",
    observations: r.observations ?? "",
  };

  if (agendaStatus === "concluido" && (r.description ?? "").trim() !== "") {
    event.completionDescription = r.description.trim();
  }
  if (r.linksPostagem && r.linksPostagem.length > 0) {
    event.linksPostagem = [...r.linksPostagem];
  }
  if (extra.length > 0) {
    event.completionPhotoDataUrls = [...extra];
  }
  if (r.equipe?.trim()) event.equipe = r.equipe.trim();
  if (r.equipeIntegrantes?.length) {
    event.equipeIntegrantes = [...r.equipeIntegrantes];
  } else if (r.equipe?.trim()) {
    event.equipeIntegrantes = r.equipe
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof r.panfletosDistribuidos === "number") {
    event.panfletosDistribuidos = r.panfletosDistribuidos;
  }
  if (r.locaisAtendidos?.trim()) {
    event.locaisAtendidos = r.locaisAtendidos.trim();
  }
  if (isSubregionalId(r.subregional)) {
    event.subregional = r.subregional;
  }
  if (r.type === "panfletagem" && typeof r.photos === "number") {
    event.fotosTiradas = r.photos;
  }

  return event;
}
