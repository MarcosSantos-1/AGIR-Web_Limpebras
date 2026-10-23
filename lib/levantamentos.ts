import { FIELDS, fieldVersion, type Diagnostic } from "@/lib/diagnosticos";

export type Levantamento = {
  id: string; period: string; title: string; sourceId?: string;
  status: "em-preenchimento" | "concluido";
  expectedCodes: string[]; notes: string; revision: number; updatedAtMs?: number;
};

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

export async function buildLevantamentoWorkbook(records: Diagnostic[], version: string) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Levantamento LoDIR");
  sheet.columns = FIELDS.map((field) => ({ key: field.key, width: field.key === "endereco" ? 48 : 24 }));
  const modules = [[1, 15, "MÓDULO I - CONTROLE E IDENTIFICAÇÃO", "FF065F46"], [16, 25, "MÓDULO II - CARACTERÍSTICAS DO LOGRADOURO", "FF0E7490"], [26, 49, "MÓDULO III - CARACTERÍSTICAS DO DESCARTE IRREGULAR RECORRENTE", "FF334155"]] as const;
  for (const [start, end, label, color] of modules) {
    sheet.mergeCells(1, start, 1, end);
    const cell = sheet.getCell(1, start); cell.value = label;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  }
  sheet.getRow(1).height = 34;
  const header = sheet.getRow(2);
  header.values = FIELDS.map((field) => fieldVersion(field, version).instruction);
  header.height = 320;
  header.eachCell((cell) => { cell.font = { bold: true, size: 10 }; cell.alignment = { wrapText: true, vertical: "top" }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }; });
  for (const record of orderedExportRows(records)) {
    const row = sheet.addRow(FIELDS.map((field) => record.answers[field.key] ?? null));
    row.height = 36;
    row.alignment = { wrapText: true, vertical: "middle" };
    const date = record.answers.dataChecagem;
    if (date) { row.getCell(5).value = new Date(`${date}T12:00:00Z`); row.getCell(5).numFmt = "dd/mm/yyyy"; }
    if (String(record.answers.antiguidade ?? "").toLowerCase().includes("novo")) row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }; });
    row.getCell(1).numFmt = "@";
    row.getCell(13).numFmt = "0.000000"; row.getCell(14).numFmt = "0.000000";
  }
  sheet.views = [{ state: "frozen", ySplit: 2, xSplit: 1 }];
  sheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: Math.max(2, sheet.rowCount), column: 49 } };
  return workbook;
}
