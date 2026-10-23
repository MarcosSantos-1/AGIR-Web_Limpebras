import type { MapDisplayPoint } from "@/lib/map-features";
import { FIELDS, localToday, periodForDate, QUESTIONNAIRE_VERSION, type Diagnostic } from "@/lib/diagnosticos";
import { newestByPoint, type Levantamento } from "@/lib/levantamentos";
import { mergeSurveyRows } from "@/lib/levantamento-rows";

export const SURVEY_COLORS = { concluido: "#16a34a", pendente: "#eab308", inativo: "#71717a" };

export function recordsForSurvey(survey: Levantamento, records: Diagnostic[]) {
  return records.filter((r) => r.kind === "trimestral" && (r.sourceId === (survey.sourceId ?? survey.id) || (!survey.sourceId && r.sourceId === "campo" && r.period === survey.period)));
}
export function surveyCodes(survey: Levantamento, points: MapDisplayPoint[]) {
  return [...new Set([...survey.expectedCodes, ...(survey.status === "em-preenchimento" && !survey.sourceId ? points.map((p) => p.id) : [])])];
}
export function pointDiagnostic(point: MapDisplayPoint, survey: Levantamento, baseline?: Diagnostic): Diagnostic {
  const answers: Diagnostic["answers"] = { codigo: point.id, endereco: point.address, latitude: point.position[0], longitude: point.position[1], subprefeitura: point.subprefeitura ?? "", sigla: point.id.split("-")[0], lote: "Lote 3" };
  if (baseline) for (const f of FIELDS) if ((f.step === 0 && f.key !== "dataChecagem" || f.step === 2) && baseline.answers[f.key] !== undefined) answers[f.key] = baseline.answers[f.key];
  // Current catalogue address/GPS take precedence over outdated historical entries.
  Object.assign(answers, { codigo: point.id, endereco: point.address, latitude: point.position[0], longitude: point.position[1] });
  if (periodForDate(localToday()) === survey.period) answers.dataChecagem = localToday();
  answers.antiguidade = baseline ? "“Antigo”, já existia no(s) trimestre(s) anterior(es)." : "“Novo”, surgiu durante este trimestre.";
  return { id: `${survey.id}-${point.id}`, schemaVersion: 1, questionnaireVersion: QUESTIONNAIRE_VERSION, kind: "trimestral", period: survey.period, state: "rascunho", pointId: point.id, answers, observedStatus: "nao-avaliado", notes: "", photos: [], sourceId: survey.id, revision: 0 };
}
export function buildSurveyRows(survey: Levantamento, points: MapDisplayPoint[], baseline: Diagnostic[], records: Diagnostic[]) {
  const updates = recordsForSurvey(survey, records);
  if (survey.sourceId) return mergeSurveyRows(baseline, updates);
  const byCode = new Map(points.map((p) => [p.id, p]));
  const originals = new Map(baseline.map((r) => [r.pointId, r]));
  const saved = newestByPoint(updates);
  const codes = new Set([...surveyCodes(survey, points), ...saved.keys()]);
  return [...codes].flatMap((code) => {
    const existing = saved.get(code);
    if (existing) return [existing];
    const point = byCode.get(code);
    if (point) return [pointDiagnostic(point, survey, originals.get(code))];
    const original = originals.get(code);
    if (!original) return [];
    return [pointDiagnostic({ id: code, type: "ponto-viciado", address: String(original.answers.endereco ?? ""), title: code, status: "ativo", position: [Number(original.answers.latitude), Number(original.answers.longitude)], lastAction: null, responsible: null, recurrent: false, occurrences: 0 }, survey, original)];
  });
}
export function surveyPointState(record: Diagnostic, baseline?: Diagnostic, catalogueInactive = false): keyof typeof SURVEY_COLORS {
  if (record.state === "concluido") return "concluido";
  const status = record.answers.statusTrimestral ?? baseline?.answers.statusTrimestral;
  return status ? String(status).includes("inativo") ? "inativo" : "pendente" : catalogueInactive ? "inativo" : "pendente";
}
export function distanceMeters(a: [number, number], b: [number, number]) {
  const rad = (n: number) => n * Math.PI / 180;
  const dLat = rad(b[0] - a[0]); const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
