import metadata from "@/data/diagnosticos/fields.json";

export const DIAGNOSTICOS_COLLECTION = "diagnosticos";
export const QUESTIONNAIRE_VERSION = "2026-T3-rev-20261019";
export const STEPS = ["Identificação", "Situação", "Logradouro e entorno", "Resíduos e origens", "Riscos e proximidades", "Fotos e revisão"];
export type Answer = string | number;
export type DiagnosticPhoto = { id: string; url: string; key: string; caption: string };
export type Diagnostic = {
  id: string;
  schemaVersion: 1;
  questionnaireVersion: string;
  kind: "visita" | "trimestral";
  period: string;
  state: "rascunho" | "concluido" | "importado";
  pointId: string;
  answers: Record<string, Answer>;
  observedStatus: "com-residuos" | "sem-residuos" | "nao-avaliado";
  notes: string;
  photos: DiagnosticPhoto[];
  sourceId: string;
  source?: { file: string; sheet: string; row: number; sha256: string };
  revision: number;
  createdByUid?: string;
  updatedByUid?: string;
  responsibleName?: string;
  createdAtMs?: number;
  updatedAtMs?: number;
};
export type HistoricalSource = { id: string; label: string; file: string; period: string; count: number; newCount?: number; checkedFrom?: string; checkedTo?: string; issues: { row: number; code: string; reason: string }[] };
export type DiagnosticField = {
  key: string; label: string; column: string; type: string; step: number; quarterly: boolean;
  versions: Record<string, { instruction: string; options: string[] }>;
};
export const FIELDS = metadata as DiagnosticField[];

export function fieldVersion(field: DiagnosticField, version: string) {
  return field.versions[version] ?? field.versions[QUESTIONNAIRE_VERSION];
}

export function localToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function periodForDate(date: string) {
  return `${date.slice(0, 4)}-T${Math.ceil(Number(date.slice(5, 7)) / 3)}`;
}

export function newDiagnostic(): Diagnostic {
  const today = localToday();
  return { id: crypto.randomUUID(), schemaVersion: 1, questionnaireVersion: QUESTIONNAIRE_VERSION,
    kind: "visita", period: periodForDate(today), state: "rascunho", pointId: "", answers: { dataChecagem: today, lote: "Lote 3" },
    observedStatus: "nao-avaliado", notes: "", photos: [], sourceId: "campo", revision: 0 };
}

export function diagnosticErrors(record: Diagnostic, complete = false, original?: Diagnostic): Record<string, string> {
  const errors: Record<string, string> = {};
  const a = record.answers;
  if (!/^[A-Z]{1,3}-\d+$/.test(String(a.codigo ?? ""))) errors.codigo = "Informe um código como CV-001.";
  if (!String(a.endereco ?? "").trim()) errors.endereco = "Informe o endereço.";
  const date = String(a.dataChecagem ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) errors.dataChecagem = "Informe uma data válida.";
  if (!/^\d{4}-T[1-4]$/.test(record.period)) errors.period = "Use uma competência como 2026-T3.";
  if (record.kind === "trimestral" && !errors.dataChecagem && periodForDate(date) !== record.period) errors.period = "A checagem deve pertencer ao trimestre informado.";
  for (const field of FIELDS) {
    if (record.kind === "visita" && field.quarterly) continue;
    const value = a[field.key];
    const missing = value === undefined || value === "";
    const optional = field.key === "complemento" || (field.key === "outroLogradouro" && a.tipoLogradouro !== "Outros.");
    if (complete && missing && !optional) errors[field.key] = "Preencha ou selecione uma resposta.";
    if (missing) continue;
    const unchangedHistoricalValue = !complete && original?.source && original.answers[field.key] === value;
    if (field.type === "select" && !fieldVersion(field, record.questionnaireVersion).options.includes(String(value)) && !unchangedHistoricalValue) errors[field.key] = "Escolha uma alternativa desta versão do questionário.";
    if (field.type === "number") {
      const n = Number(value);
      if (!Number.isFinite(n) || (field.key === "limpezas" && (!Number.isInteger(n) || n < 0)) || (field.key === "latitude" && Math.abs(n) > 90) || (field.key === "longitude" && Math.abs(n) > 180)) errors[field.key] = "Informe um número válido dentro dos limites.";
    }
  }
  if (complete && record.kind === "visita" && record.observedStatus === "nao-avaliado" && !record.notes.trim()) errors.notes = "Explique por que o local não pôde ser avaliado.";
  if (record.kind === "trimestral" && String(a.statusTrimestral ?? "").includes("inativo") && a.limpezas !== undefined && a.limpezas !== "" && Number(a.limpezas) !== 0) errors.limpezas = "O modelo exige zero limpezas para ponto inativo no trimestre.";
  return errors;
}

export function diagnosticStatus(record: Diagnostic) {
  return record.kind === "visita"
    ? ({ "com-residuos": "Com resíduos", "sem-residuos": "Sem resíduos", "nao-avaliado": "Não avaliado" }[record.observedStatus])
    : String(record.answers.statusTrimestral ?? "Sem classificação");
}

export function sortDiagnostics(a: Diagnostic, b: Diagnostic) {
  return String(b.answers.dataChecagem ?? "").localeCompare(String(a.answers.dataChecagem ?? "")) || a.pointId.localeCompare(b.pointId);
}
