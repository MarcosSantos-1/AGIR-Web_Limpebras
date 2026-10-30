import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildSurveyRows, distanceMeters, pointDiagnostic, recordsForSurvey, surveyCodes, surveyPointState } from "../lib/survey-workspace";
import { periodFromTitle, surveyOpenDate, surveyProgress, type Levantamento } from "../lib/levantamentos";
import { emptyFichaDraft, fichaOptions } from "../lib/ponto-ficha";
import type { MapDisplayPoint } from "../lib/map-features";
import { assertSingleOpenSurvey, assertZeroCompleted } from "../lib/survey-lifecycle";

const survey: Levantamento = { id: "levantamento-2026-T4-test", title: "4º trimestre de 2026", period: "2026-T4", status: "em-preenchimento", expectedCodes: ["CV-001"], notes: "", revision: 1 };
const point: MapDisplayPoint = { id: "CV-001", title: "CV-001", address: "Rua Exemplo, 10", type: "ponto-viciado", position: [-23.5, -46.6], status: "ativo", recurrent: false, occurrences: 0, lastAction: null, responsible: null, subprefeitura: "Casa Verde" };

test("human-readable quarter titles parse into the stable period code", () => {
  assert.equal(periodFromTitle("4º trimestre de 2026"), "2026-T4");
  assert.equal(periodFromTitle(" 1° trimestre de 2027 "), "2027-T1");
  assert.equal(periodFromTitle("5º trimestre de 2026"), null);
  assert.equal(periodFromTitle("2026-T4"), null);
});

test("new catalogue points join open surveys immediately and do not change closed ones", () => {
  const fresh = { ...point, id: "CV-002" };
  assert.deepEqual(surveyCodes(survey, [point, fresh]), ["CV-001", "CV-002"]);
  assert.deepEqual(surveyCodes({ ...survey, status: "concluido" }, [point, fresh]), ["CV-001"]);
  const rows = buildSurveyRows(survey, [point, fresh], [], []);
  assert.equal(rows.length, 2);
  assert.ok(String(rows[1].answers.antiguidade).includes("Novo"));
  assert.equal(surveyProgress(surveyCodes(survey, [point, fresh]), []).total, 2);
});

test("prefill preserves saved answers and uses current catalogue location", () => {
  const original = pointDiagnostic(point, survey);
  original.answers.latitude = -24;
  original.answers.distrito = "Limão";
  original.answers.entornoRio = "Sim.";
  const prepared = pointDiagnostic(point, survey, original);
  assert.equal(prepared.answers.latitude, point.position[0]);
  assert.equal(prepared.answers.distrito, "Limão");
  assert.equal(prepared.answers.entornoRio, "Sim.");
  assert.equal(prepared.answers.lote, "Lote 3");
  assert.equal(prepared.answers.volume, undefined);
  original.answers.lote = "Lote 1";
  assert.equal(pointDiagnostic(point, survey, original).answers.lote, "Lote 3");
  const ficha = emptyFichaDraft();
  ficha.complemento = "Praça";
  ficha.tipoLogradouro = fichaOptions("tipoLogradouro")[0];
  original.answers.complemento = "Texto antigo";
  original.answers.outroLogradouro = "Córrego canalizado";
  const withFicha = pointDiagnostic(point, survey, original, ficha);
  assert.equal(withFicha.answers.complemento, "Praça");
  assert.equal(withFicha.answers.tipoLogradouro, ficha.tipoLogradouro);
  assert.equal(withFicha.answers.outroLogradouro, undefined);
  const saved = { ...prepared, revision: 2, notes: "Persistido", state: "concluido" as const };
  const rows = buildSurveyRows(survey, [point], [original], [saved]);
  assert.equal(rows[0].notes, "Persistido");
  assert.equal(rows[0].revision, 2);
});

test("point colours reflect current completion and prior inactivity without hiding points", () => {
  const record = pointDiagnostic(point, survey);
  assert.equal(surveyPointState(record), "pendente");
  const inactive = { ...record, answers: { ...record.answers, statusTrimestral: "Permaneceu inativo" } };
  assert.equal(surveyPointState(record, inactive), "inativo");
  assert.equal(surveyPointState({ ...record, state: "concluido" }, inactive), "concluido");
  assert.equal(buildSurveyRows(survey, [{ ...point, status: "inativo" }], [inactive], []).length, 1);
});

test("survey records never borrow completion from a previous quarter or revision", () => {
  const record = pointDiagnostic(point, survey);
  assert.equal(recordsForSurvey(survey, [record, { ...record, sourceId: "another-survey", state: "concluido" }]).length, 1);
  assert.equal(recordsForSurvey(survey, [{ ...record, sourceId: "campo", period: "2026-T3" }]).length, 0);
});

test("survey opening date counts from the day the filling started", () => {
  assert.equal(surveyOpenDate({ period: "2026-T4" }), "2026-10-01");
  assert.equal(surveyOpenDate({ period: "2026-T1" }), "2026-01-01");
  assert.equal(surveyOpenDate({ period: "2026-T4", openedAtMs: Date.UTC(2026, 9, 20, 15) }), "2026-10-20");
});

test("GPS proximity uses geographic distance in metres", () => {
  assert.equal(distanceMeters(point.position, point.position), 0);
  assert.ok(Math.abs(distanceMeters([0, 0], [0, 0.01]) - 1111.95) < 1);
});

test("survey lifecycle rejects a second active survey and cancelling completed work", () => {
  assert.throws(() => assertSingleOpenSurvey("new", [survey]), /Já existe/);
  assert.doesNotThrow(() => assertSingleOpenSurvey(survey.id, [survey]));
  assert.doesNotThrow(() => assertSingleOpenSurvey("new", [{ ...survey, status: "cancelado" }]));
  assert.doesNotThrow(() => assertZeroCompleted(0));
  assert.throws(() => assertZeroCompleted(1), /zero pontos/);
});
