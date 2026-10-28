import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  isPontoViciadoCodigoEmUso,
  normalizePontoViciadoCodigo,
  pontoViciadoCodigoEmUsoNoMapa,
} from "../lib/ponto-viciado-codigo";

const catalog = ["CV-001", "CV-010", "JT-003"];

test("normaliza código para comparação", () => {
  assert.equal(normalizePontoViciadoCodigo("  cv-010 "), "CV-010");
});

test("código novo e código de ecoponto não bloqueiam o cadastro", () => {
  assert.equal(isPontoViciadoCodigoEmUso("CV-144", catalog, []), false);
  assert.equal(isPontoViciadoCodigoEmUso("CV-10", catalog, []), false);
  assert.equal(pontoViciadoCodigoEmUsoNoMapa("CV-10", []), false);
  assert.equal(pontoViciadoCodigoEmUsoNoMapa("CV-001", []), true);
});

test("mesmo código com outra caixa continua ocupado", () => {
  assert.equal(isPontoViciadoCodigoEmUso("cv-001", catalog, []), true);
});

test("ponto excluído pode ser cadastrado de novo", () => {
  const entries = [
    { firestoreDocId: "hide-1", ocultoCodigo: "CV-001" },
    { firestoreDocId: "old", pointId: "CV-001" },
  ];
  assert.equal(isPontoViciadoCodigoEmUso("CV-001", catalog, entries), false);
  assert.equal(isPontoViciadoCodigoEmUso("cv-001", catalog, entries), false);
});

test("ponto visível da equipa continua ocupado", () => {
  const entries = [{ firestoreDocId: "pv-1", pointId: "CV-200" }];
  assert.equal(isPontoViciadoCodigoEmUso("CV-200", catalog, entries), true);
});

test("edição do próprio ponto não acusa o código como novo", () => {
  assert.equal(
    isPontoViciadoCodigoEmUso("CV-001", catalog, [], {
      sourceCodigo: "CV-001",
    }),
    false,
  );
  assert.equal(
    isPontoViciadoCodigoEmUso("JT-003", catalog, [], {
      sourceCodigo: "CV-001",
    }),
    true,
  );
});
