/**
 * Regenera data/features-PV.json a partir do Excel de pontos viciados.
 *
 * Executar: npm run import:pontos-viciados
 */
import ExcelJS from "exceljs";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const XLSX_CANDIDATES = [
  path.join(ROOT, "data", "pontos-viciados .xlsx"),
  path.join(ROOT, "data", "pontos-viciados.xlsx"),
];
const OUT_JSON = path.join(ROOT, "data", "features-PV.json");

type PvFeatureOut = {
  id: string;
  service: "PV";
  setor: string;
  name: string;
  coords: [[number, number]];
  centroid: [number, number];
  fillColor: string;
  geometry: "point";
  serviceDisplay: "Pontos Viciados";
  subprefeitura: string;
  logradouro: string;
  service_type: "Pontos Viciados";
  service_icon: "warning";
  volumetria: string;
  address: string;
  status?: string;
  limpezas?: number;
  frequencia?: string;
  ultimaRevitalizacao?: string | null;
};

function cellStr(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object" && "text" in v && typeof v.text === "string") {
    return v.text.trim();
  }
  if (typeof v === "object" && "result" in v) {
    return cellStr(v.result as ExcelJS.CellValue);
  }
  return String(v).trim();
}

function cellNum(v: ExcelJS.CellValue): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

/** Excel date serial or Date → yyyy-MM-dd */
function cellDateIso(v: ExcelJS.CellValue): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    // Excel serial (days since 1899-12-30)
    const utc = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    if (!Number.isNaN(utc.getTime())) {
      return utc.toISOString().slice(0, 10);
    }
  }
  const s = cellStr(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (br) {
    const [, d, m, y] = br;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function normalizeStatus(raw: string): string | undefined {
  const s = raw.trim().toLowerCase();
  if (!s) return undefined;
  if (s.includes("inativ")) return "Inativo";
  if (s.includes("revital")) return "Revitalizado";
  return raw.trim();
}

async function main(): Promise<void> {
  const xlsxPath = XLSX_CANDIDATES.find((p) => fs.existsSync(p));
  if (!xlsxPath) {
    throw new Error(
      `Excel não encontrado. Esperado em:\n  ${XLSX_CANDIDATES.join("\n  ")}`,
    );
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Planilha vazia");

  const features: PvFeatureOut[] = [];
  let idx = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const id = cellStr(row.getCell(1).value).toUpperCase();
    if (!id || !/^[A-Z]{2,3}-\d+$/.test(id)) continue;

    const address = cellStr(row.getCell(2).value);
    const subprefeitura = cellStr(row.getCell(4).value);
    const volumetria = cellStr(row.getCell(5).value);
    const lat = cellNum(row.getCell(6).value);
    const lng = cellNum(row.getCell(7).value);
    if (lat == null || lng == null) {
      console.warn(`Ignorado ${id}: lat/lng inválidos`);
      continue;
    }

    const limpezas = cellNum(row.getCell(8).value);
    const frequencia = cellStr(row.getCell(9).value) || undefined;
    const ultimaRevitalizacao = cellDateIso(row.getCell(10).value);
    const status = normalizeStatus(cellStr(row.getCell(11).value));

    const latR = Math.round(lat * 1e6) / 1e6;
    const lngR = Math.round(lng * 1e6) / 1e6;

    features.push({
      id: `PV:${idx}`,
      service: "PV",
      setor: id,
      name: id,
      coords: [[latR, lngR]],
      centroid: [latR, lngR],
      fillColor: "#adff2f",
      geometry: "point",
      serviceDisplay: "Pontos Viciados",
      subprefeitura,
      logradouro: address,
      service_type: "Pontos Viciados",
      service_icon: "warning",
      volumetria,
      address,
      ...(status ? { status } : {}),
      ...(limpezas != null ? { limpezas } : {}),
      ...(frequencia ? { frequencia } : {}),
      ultimaRevitalizacao: ultimaRevitalizacao,
    });
    idx += 1;
  }

  const out = {
    service: "PV",
    features,
  };

  fs.writeFileSync(OUT_JSON, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log(
    `OK: ${features.length} pontos → ${path.relative(ROOT, OUT_JSON)} (fonte: ${path.relative(ROOT, xlsxPath)})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
