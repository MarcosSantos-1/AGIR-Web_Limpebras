import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  isPontoViciadoCodigoEmUso,
  nextPontoViciadoCodigo,
  normalizePontoViciadoCodigo,
  pontoViciadoCodigoEmUsoNoMapa,
} from "../lib/ponto-viciado-codigo";

import { loadSubregionais } from "../lib/map/subregionais-server";
import { subregionalFromCoordinates } from "../lib/map/subregionais";

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

test("a numeração avança após o maior código ativo da subregional", () => {
  const active = new Set(["CV-001", "CV-142", "CV-143", "JT-800"]);
  assert.equal(nextPontoViciadoCodigo("CV", active, new Set()), "CV-144");
  assert.equal(nextPontoViciadoCodigo("ST", active, new Set()), "ST-001");
});

test("reutiliza o menor código excluído sem colidir com uma numeração ativa", () => {
  const active = new Set(["CV-1", "CV-143"]);
  const deleted = new Set(["CV-001", "CV-140", "CV-005", "MG-002"]);
  assert.equal(nextPontoViciadoCodigo("CV", active, deleted), "CV-005");
  assert.equal(nextPontoViciadoCodigo("MG", active, deleted), "MG-002");
});

test("o GeoJSON oficial identifica as quatro subregionais e rejeita pontos fora do lote", async () => {
  const geo = await loadSubregionais();
  const locations = [
    ["CV", -23.508, -46.660],
    ["JT", -23.458, -46.582],
    ["ST", -23.499, -46.625],
    ["MG", -23.518, -46.592],
  ] as const;
  for (const [sigla, lat, lng] of locations) {
    assert.equal(subregionalFromCoordinates(geo, lat, lng)?.abbrev, sigla);
  }
  assert.equal(subregionalFromCoordinates(geo, -23.55, -46.63), undefined);
  const [lng, lat] = geo.features[0].geometry.coordinates[0][0];
  assert.ok(subregionalFromCoordinates(geo, lat, lng));
});
