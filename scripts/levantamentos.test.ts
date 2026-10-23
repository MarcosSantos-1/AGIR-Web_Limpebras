import { strict as assert } from "node:assert";
import { test } from "node:test";
import { FIELDS, newDiagnostic } from "../lib/diagnosticos";
import { buildLevantamentoWorkbook, orderedExportRows, periodDates, surveyProgress } from "../lib/levantamentos";
import { mergeSurveyRows } from "../lib/levantamento-rows";

test("progress counts completed points rather than fields or duplicate diagnostics", () => {
  const codes = Array.from({ length: 500 }, (_, i) => `CV-${i + 1}`);
  const records = codes.slice(0, 50).map((code) => ({ ...newDiagnostic(), kind: "trimestral" as const, pointId: code, state: "concluido" as const }));
  assert.deepEqual(surveyProgress(codes, [...records, records[0]]), { total: 500, completed: 50, percent: 10, newPoints: 0 });
  const revising = { ...records[0], state: "rascunho" as const, updatedAtMs: 100 };
  assert.equal(surveyProgress(codes, [...records, revising]).completed, 49);
  const newPoint = { ...records[0], pointId: "CV-999" };
  assert.equal(surveyProgress(codes, [...records, newPoint]).total, 501);
  assert.equal(surveyProgress(codes, [...records, newPoint]).newPoints, 1);
});

test("workbook keeps exactly A:AW, original headers, typed values and new points last", async () => {
  const old = { ...newDiagnostic(), pointId: "CV-001", answers: { codigo: "CV-001", endereco: "Rua A, 10", limpezas: 0, dataChecagem: "2026-10-22", latitude: -23.5, antiguidade: "“Antigo”, já existia no(s) trimestre(s) anterior(es)." } };
  const fresh = { ...old, id: "new", pointId: "CV-002", answers: { ...old.answers, codigo: "CV-002", antiguidade: "“Novo”, surgiu durante este trimestre." } };
  assert.equal(orderedExportRows([fresh, old])[0].pointId, old.pointId);
  const workbook = await buildLevantamentoWorkbook([fresh, old], old.questionnaireVersion);
  const sheet = workbook.worksheets[0];
  assert.equal(sheet.columnCount, 49);
  assert.equal(sheet.getCell("A2").value, FIELDS[0].versions[old.questionnaireVersion].instruction);
  assert.equal(sheet.getCell("AW2").value, FIELDS[48].versions[old.questionnaireVersion].instruction);
  assert.equal(sheet.getCell("A3").value, "CV-001");
  assert.equal(sheet.getCell("A4").value, "CV-002");
  assert.equal(sheet.getCell("J3").value, 0);
  assert.ok(sheet.getCell("E3").value instanceof Date);
  assert.equal(sheet.getCell("M3").value, -23.5);
  const { default: ExcelJS } = await import("exceljs");
  const reread = new ExcelJS.Workbook();
  await reread.xlsx.load(await workbook.xlsx.writeBuffer());
  assert.equal(reread.worksheets[0].columnCount, 49);
  assert.equal(reread.worksheets[0].getCell("AW2").value, sheet.getCell("AW2").value);
});

test("quarter dates include correct month and leap-year boundaries", () => {
  assert.equal(periodDates("2026-T4"), "01/10/2026 — 31/12/2026");
  assert.equal(periodDates("2024-T1"), "01/01/2024 — 31/03/2024");
});

test("historical edits replace the same source row even after correcting a point code", () => {
  const row = { ...newDiagnostic(), id: "source-row-10", pointId: "CV-001" };
  const corrected = { ...row, pointId: "CV-002", updatedAtMs: 10 };
  const merged = mergeSurveyRows([row], [corrected]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].pointId, "CV-002");
});
