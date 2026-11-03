import { subregionalIdFromSubprefeitura, subregionalMeta, type SubregionalId } from "../../../lib/constants/subregionais";
import type { Diagnostic } from "../../../lib/diagnosticos";

export type PointState = "concluido" | "pendente" | "inativo";
export type SubFilter = "todas" | Exclude<SubregionalId, "interno"> | "outras";

export type FieldPoint = {
  code: string;
  row: Diagnostic;
  state: PointState;
  position: [number, number] | null;
  subId: Exclude<SubFilter, "todas">;
  subLabel: string;
  distance: number | null;
};

export const STATUS_LABEL: Record<PointState, string> = {
  concluido: "Concluído",
  pendente: "Pendente",
  inativo: "Inativo, confirmar",
};

export function pointStatusLabel(point: FieldPoint) {
  if (point.state !== "concluido" && point.row.revision > 0 && point.row.state === "rascunho") return "Rascunho";
  return STATUS_LABEL[point.state];
}

const STATUS_COLORS: Record<PointState, string> = {
  concluido: "#16a34a",
  pendente: "#eab308",
  inativo: "#71717a",
};

export function statusColor(state: PointState) {
  return STATUS_COLORS[state] ?? STATUS_COLORS.pendente;
}

export function subColor(id: FieldPoint["subId"]) {
  if (id === "outras") return "#a1a1aa";
  return subregionalMeta(id).color;
}

export function inkOn(color: string) {
  return color === "#1e3a5f" ? "#ffffff" : "#18181b";
}

export function subOf(subprefeitura: unknown): { id: Exclude<SubFilter, "todas">; label: string } {
  const regional = subregionalIdFromSubprefeitura(String(subprefeitura ?? ""));
  if (!regional || regional === "interno") return { id: "outras", label: "Outras" };
  return { id: regional, label: subregionalMeta(regional).label };
}

export function formatDistance(meters: number | null) {
  if (meters === null) return "Distância indisponível";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

export function formatDate(value: unknown) {
  const date = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split("-").reverse().join("/") : "hoje";
}

export function formatCoord(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(5) : "";
}

export function hasCoordinates(record: Diagnostic) {
  const lat = Number(record.answers.latitude);
  const lng = Number(record.answers.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && record.answers.latitude !== "" && record.answers.longitude !== "";
}

export function matchesSub(point: FieldPoint, filter: SubFilter) {
  return filter === "todas" || point.subId === filter;
}
