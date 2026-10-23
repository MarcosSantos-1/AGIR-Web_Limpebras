import { strict as assert } from "node:assert";
import { test } from "node:test";
import historical from "../data/diagnosticos/historical.json";
import { FIELDS, diagnosticErrors, fieldVersion, newDiagnostic, periodForDate, type Diagnostic } from "../lib/diagnosticos";
import { sanitizeStorageObjectKey } from "../lib/storage/storage-object-key";

function visit(): Diagnostic {
  const record = newDiagnostic();
  record.answers = { ...record.answers, codigo: "CV-001", endereco: "Avenida de teste, 100" };
  record.pointId = "CV-001";
  return record;
}

test("historical revisions stay separate, deterministic and complete", () => {
  assert.equal(historical.sources.length, 6);
  assert.deepEqual(historical.sources.map((s) => s.count), [434, 434, 451, 494, 509, 537]);
  assert.equal(historical.records.length, 2859);
  assert.equal(new Set(historical.records.map((r) => r.id)).size, 2859);
  assert.equal(historical.sources[5].issues[0].row, 540);
  for (const source of historical.sources) {
    const records = historical.records.filter((r) => r.sourceId === source.id);
    assert.equal(records.length, source.count);
    assert.equal(new Set(records.map((r) => r.pointId)).size, records.length);
    assert.ok(records.every((r) => r.answers.endereco && r.answers.dataChecagem && r.source.sha256));
  }
  const first = historical.records.find((r) => r.id === "hist-2026-T3-ST-059")!;
  const revised = historical.records.find((r) => r.id === "hist-2026-T3-rev-20261019-ST-059")!;
  assert.equal(revised.source.row, 467);
  assert.equal(first.period, revised.period);
  assert.notEqual(first.id, revised.id);
});

test("all 49 fields have versioned instructions and select alternatives", () => {
  assert.equal(FIELDS.length, 49);
  assert.equal(new Set(FIELDS.map((f) => f.key)).size, 49);
  assert.equal(FIELDS[48].column, "AW");
  for (const field of FIELDS) for (const source of historical.sources) {
    const version = fieldVersion(field, source.id);
    assert.ok(version.instruction);
    if (field.type === "select") assert.ok(version.options.length > 0);
  }
});

test("draft allows incomplete inspection but requires identity, address and date", () => {
  assert.deepEqual(diagnosticErrors(visit()), {});
  const r = visit(); r.answers.codigo = "PV:0"; r.answers.endereco = ""; r.answers.dataChecagem = "2026-02-30";
  const errors = diagnosticErrors(r);
  assert.ok(errors.codigo && errors.endereco && errors.dataChecagem);
});

test("completion keeps unknown answers distinct and requires an explanation if unassessed", () => {
  const r = visit();
  const errors = diagnosticErrors(r, true);
  assert.ok(errors.riscoAves);
  assert.ok(errors.notes);
  assert.equal(errors.statusTrimestral, undefined);
  r.answers.riscoAves = "Não sei responder.";
  assert.ok(diagnosticErrors(r).riscoAves); // not an allowed answer for this specific battery
});

test("quarterly inactive status requires zero cleanings, and period must match", () => {
  const r = visit(); r.kind = "trimestral"; r.answers.dataChecagem = "2026-09-01"; r.period = "2026-T3";
  r.answers.statusTrimestral = "Permaneceu “inativo”, não recebeu descarte irregular de resíduos.";
  r.answers.limpezas = 1;
  assert.ok(diagnosticErrors(r).limpezas);
  r.answers.limpezas = 0;
  assert.equal(diagnosticErrors(r).limpezas, undefined);
  r.period = "2026-T4";
  assert.ok(diagnosticErrors(r).period);
  assert.equal(periodForDate("2026-09-30"), "2026-T3");
  assert.equal(periodForDate("2026-10-01"), "2026-T4");
});

test("coordinates and cleaning count reject invalid ranges and fractional counts", () => {
  const r = visit(); r.kind = "trimestral"; r.answers.latitude = -91; r.answers.longitude = 181; r.answers.limpezas = 2.5;
  const errors = diagnosticErrors(r);
  assert.ok(errors.latitude && errors.longitude && errors.limpezas);
});

test("unchanged historical alternatives can be preserved while editing but must be reviewed to complete", () => {
  const original = historical.records.find((r) => r.id === "hist-2025-T3-CV-002") as Diagnostic;
  assert.ok(diagnosticErrors(original).volume);
  assert.equal(diagnosticErrors({ ...original, notes: "Revisão cadastral" }, false, original).volume, undefined);
  assert.ok(diagnosticErrors(original, true, original).volume);
  assert.ok(diagnosticErrors({ ...original, answers: { ...original.answers, volume: "Valor inventado" } }, false, original).volume);
});

test("photo storage supports diagnostics while rejecting traversal", () => {
  assert.equal(sanitizeStorageObjectKey("diagnosticos/uuid/photo.jpg"), "diagnosticos/uuid/photo.jpg");
  assert.equal(sanitizeStorageObjectKey("diagnosticos/../photo.jpg"), null);
});
