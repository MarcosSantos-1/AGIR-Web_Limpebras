import ExcelJS from "exceljs";
import type { AgendaEvent } from "@/data/agenda-events";
import type { HistoryRecordDoc } from "@/data/history-records";

const MAX_PHOTO_COLS = 20;

/** Colunas foto_1 … foto_MAX com URLs individuais; coluna agregada com `; `. */
const FOTO_PREFIX = "foto_";

function cellStr(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function joinSemicolon(items: string[] | undefined): string {
  if (!items?.length) return "";
  return items.map((x) => x.trim()).filter(Boolean).join("; ");
}

function fotoColumns(urls: string[] | undefined): string[] {
  const u = urls ?? [];
  const cells: string[] = [];
  for (let i = 0; i < MAX_PHOTO_COLS; i += 1) {
    cells.push(u[i]?.trim() ?? "");
  }
  return cells;
}

function agendaHeaders(): string[] {
  return [
    "id",
    "title",
    "type",
    "status",
    "responsible",
    "date",
    "time",
    "endTime",
    "location",
    "subregional",
    "priority",
    "observations",
    "equipe",
    "equipeIntegrantes",
    "panfletosDistribuidos",
    "locaisAtendidos",
    "fotosTiradas",
    "completionDescription",
    "linksPostagem",
    "createdAtMs",
    "createdByUid",
    "urls_fotos_fechadas",
    ...Array.from({ length: MAX_PHOTO_COLS }, (_, i) => `${FOTO_PREFIX}${i + 1}`),
  ];
}

function historyHeaders(): string[] {
  return [
    "id",
    "title",
    "type",
    "status",
    "date",
    "time",
    "location",
    "subregional",
    "responsible",
    "description",
    "observations",
    "photos",
    "linksPostagem",
    "urls_fotos_extras",
    ...Array.from({ length: MAX_PHOTO_COLS }, (_, i) => `${FOTO_PREFIX}${i + 1}`),
  ];
}

export function agendaRow(e: AgendaEvent): (string | number)[] {
  const fotoUrls = e.completionPhotoDataUrls ?? [];
  return [
    e.id,
    e.title ?? "",
    e.type ?? "",
    e.status ?? "",
    e.responsible ?? "",
    e.date ?? "",
    e.time ?? "",
    e.endTime ?? "",
    e.location ?? "",
    cellStr(e.subregional),
    e.priority ?? "",
    e.observations ?? "",
    cellStr(e.equipe),
    joinSemicolon(e.equipeIntegrantes),
    typeof e.panfletosDistribuidos === "number" ? e.panfletosDistribuidos : "",
    cellStr(e.locaisAtendidos),
    typeof e.fotosTiradas === "number" ? e.fotosTiradas : "",
    cellStr(e.completionDescription),
    joinSemicolon(e.linksPostagem),
    typeof e.createdAtMs === "number" ? e.createdAtMs : "",
    cellStr(e.createdByUid),
    joinSemicolon(fotoUrls),
    ...fotoColumns(fotoUrls),
  ];
}

export function historyRow(h: HistoryRecordDoc): (string | number)[] {
  const extra = h.extraPhotoUrls ?? [];
  return [
    h.id,
    h.title ?? "",
    h.type ?? "",
    h.status ?? "",
    h.date ?? "",
    h.time ?? "",
    h.location ?? "",
    cellStr(h.subregional),
    h.responsible ?? "",
    h.description ?? "",
    h.observations ?? "",
    h.photos ?? "",
    joinSemicolon(h.linksPostagem),
    joinSemicolon(extra),
    ...fotoColumns(extra),
  ];
}

export async function buildAgendaHistoryExcelBlob(input: {
  agenda: AgendaEvent[];
  historico: HistoryRecordDoc[];
}): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "AGIR";

  const wsA = wb.addWorksheet("Agenda", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
  });
  const headersA = agendaHeaders();
  wsA.addRow(headersA);
  const hRowA = wsA.getRow(1);
  hRowA.font = { bold: true };
  for (const ev of input.agenda) wsA.addRow(agendaRow(ev));

  const wsH = wb.addWorksheet("Historico", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
  });
  const headersH = historyHeaders();
  wsH.addRow(headersH);
  const hRowH = wsH.getRow(1);
  hRowH.font = { bold: true };
  for (const r of input.historico) wsH.addRow(historyRow(r));

  const colCount = Math.max(headersA.length, headersH.length);
  const defaultCols = Array.from({ length: colCount }, () => ({ width: 34 }));
  wsA.columns = defaultCols.slice(0, headersA.length);
  wsH.columns = defaultCols.slice(0, headersH.length);

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function defaultAgendaHistoricoExcelFilename(): string {
  const d = new Date();
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `agir-export-${iso}.xlsx`;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
