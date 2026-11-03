import { localToday, type Diagnostic } from "@/lib/diagnosticos";

export const OPERACAO_LEVANTAMENTO_NOTA = "Coleta predominante (6.2) e a quantidade de limpezas (7) ficam em observação até a operação informar, ponto a ponto.";

export type Levantamento = {
  id: string; period: string; title: string; sourceId?: string;
  status: "em-preenchimento" | "concluido" | "cancelado";
  completedCodes?: string[];
  expectedCodes: string[]; notes: string; revision: number; updatedAtMs?: number;
  /** Dia em que o preenchimento foi aberto. Não muda nas edições seguintes. */
  openedAtMs?: number;
};

/** Primeiro dia contado para revitalização: a abertura do levantamento, ou o início do trimestre se essa data não existir. */
export function surveyOpenDate(survey: Pick<Levantamento, "period"> & { openedAtMs?: number }) {
  if (typeof survey.openedAtMs === "number" && Number.isFinite(survey.openedAtMs)) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(survey.openedAtMs));
  }
  const match = /^(\d{4})-T([1-4])$/.exec(survey.period);
  if (!match) return localToday();
  const month = (Number(match[2]) - 1) * 3 + 1;
  return `${match[1]}-${String(month).padStart(2, "0")}-01`;
}

export function periodFromTitle(title: string): string | null {
  const match = /^([1-4])\s*[º°o]?\s*trimestre\s+de\s+(\d{4})$/i.exec(title.trim());
  return match ? `${match[2]}-T${match[1]}` : null;
}

export function periodLabel(period: string) {
  const [year, quarter] = period.split("-T");
  return `${quarter}º trimestre de ${year}`;
}
export function periodDates(period: string) {
  const [year, quarter] = period.split("-T").map(Number);
  const start = (quarter - 1) * 3 + 1;
  const end = quarter * 3;
  const last = new Date(Date.UTC(year, end, 0)).getUTCDate();
  return `01/${String(start).padStart(2, "0")}/${year} — ${last}/${String(end).padStart(2, "0")}/${year}`;
}
export function newestByPoint(records: Diagnostic[]) {
  const index = new Map<string, Diagnostic>();
  for (const record of records) {
    const prev = index.get(record.pointId);
    if (!prev || (record.updatedAtMs ?? 0) >= (prev.updatedAtMs ?? 0)) index.set(record.pointId, record);
  }
  return index;
}
export function surveyProgress(expectedCodes: string[], records: Diagnostic[]) {
  const latest = newestByPoint(records.filter((r) => r.kind === "trimestral"));
  const allCodes = new Set([...expectedCodes, ...latest.keys()]);
  const completed = [...latest.values()].filter((r) => r.state === "concluido").length;
  return { total: allCodes.size, completed, percent: allCodes.size ? Math.round(completed / allCodes.size * 100) : 0,
    newPoints: [...latest.values()].filter((record) => !expectedCodes.includes(record.pointId) || String(record.answers.antiguidade ?? "").toLowerCase().includes("novo")).length };
}
export function orderedExportRows(records: Diagnostic[]) {
  return [...newestByPoint(records).values()].sort((a, b) => {
    const isNew = (r: Diagnostic) => String(r.answers.antiguidade ?? "").toLowerCase().includes("novo");
    return Number(isNew(a)) - Number(isNew(b)) || (a.source?.row ?? 99999) - (b.source?.row ?? 99999) || a.pointId.localeCompare(b.pointId, "pt-BR", { numeric: true });
  });
}
