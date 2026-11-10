import { pointIsInactive, type Diagnostic } from "@/lib/diagnosticos";
import type { MapaStatus } from "@/lib/map-features";

/** Último diagnóstico concluído de cada ponto, pela data da checagem. */
export function latestCompletedByPoint(records: Diagnostic[]) {
  const byPoint = new Map<string, Diagnostic>();
  for (const record of records) {
    if (record.state !== "concluido") continue;
    const code = record.pointId.trim().toUpperCase();
    if (!code) continue;
    const previous = byPoint.get(code);
    if (!previous || isNewerCheck(record, previous)) byPoint.set(code, record);
  }
  return byPoint;
}

function isNewerCheck(record: Diagnostic, previous: Diagnostic) {
  const date = String(record.answers.dataChecagem ?? "");
  const previousDate = String(previous.answers.dataChecagem ?? "");
  return date > previousDate || (date === previousDate && (record.updatedAtMs ?? 0) >= (previous.updatedAtMs ?? 0));
}

/** Status do mapa a partir do último diagnóstico. Sem essa resposta, o catálogo continua valendo. */
export function mapStatusFromDiagnostic(record: Diagnostic | undefined): Extract<MapaStatus, "ativo" | "inativo"> | null {
  if (!record) return null;
  const raw = String(record.answers.statusTrimestral ?? "").trim();
  if (!raw) return null;
  return pointIsInactive(record) ? "inativo" : "ativo";
}
