import { FIELDS, type Answer } from "@/lib/diagnosticos";

export type ImportedLevantamentoRow = { codigo: string; answers: Record<string, Answer> };

function dateAnswer(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const text = String(value ?? "").trim();
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  return undefined;
}

function cellAnswer(value: unknown, key: string): Answer | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "object" && value && "result" in value) return cellAnswer((value as { result: unknown }).result, key);
  if (typeof value === "object" && value && "text" in value) return cellAnswer((value as { text: unknown }).text, key);
  if (key === "dataChecagem") return dateAnswer(value);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return dateAnswer(value);
  const text = String(value).trim();
  if (!text) return undefined;
  if (key === "limpezas" || key === "latitude" || key === "longitude") {
    const n = Number(text.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return text;
}

/** Lê a matriz LoDIR (linha de instrução + dados) ou uma planilha feita à mão cuja primeira coluna é o código. */
export async function parseLevantamentoFile(buffer: ArrayBuffer): Promise<ImportedLevantamentoRow[]> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const rows: ImportedLevantamentoRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    const codigo = String(row.getCell(1).text || row.getCell(1).value || "").trim().toUpperCase();
    if (!/^[A-Z]{1,3}-\d+$/.test(codigo)) return;
    if (rowNumber === 1) return;
    const answers: Record<string, Answer> = { codigo };
    FIELDS.forEach((field, index) => {
      if (field.key === "codigo") return;
      const parsed = cellAnswer(row.getCell(index + 1).value, field.key);
      if (parsed !== undefined && parsed !== "") answers[field.key] = parsed;
    });
    answers.lote = "Lote 3";
    rows.push({ codigo, answers });
  });
  return rows;
}
