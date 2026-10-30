import { isSubregionalId, subregionalIdFromSubprefeitura } from "@/lib/constants/subregionais";
import { FIELDS, fieldVersion, localToday, type Diagnostic } from "@/lib/diagnosticos";
import { extractPontoViciadoCodigoFromRecord } from "@/lib/map/ponto-viciado-history";
import { VISTORIA_YES_NO_KEYS } from "@/lib/vistoria-keys";

export type VistoriaAutomationEvent = { type: string; status: string; date: string; title?: string; observations?: string };

export type VistoriaAutomation = { openDate: string; events: VistoriaAutomationEvent[] };

export function pointHadRevitalizacao(codigo: string, openDate: string, checkDate: string, events: VistoriaAutomationEvent[]) {
  const code = codigo.trim().toUpperCase();
  if (!code || !/^\d{4}-\d{2}-\d{2}$/.test(openDate) || !/^\d{4}-\d{2}-\d{2}$/.test(checkDate)) return false;
  return events.some((event) => {
    if (event.type !== "revitalizacao" || event.status !== "concluido") return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date) || event.date < openDate || event.date > checkDate) return false;
    return extractPontoViciadoCodigoFromRecord(event) === code;
  });
}

export type VistoriaCheck = { key: string; label: string };

export const RESIDUOS: VistoriaCheck[] = [
  { key: "residuoDomiciliar", label: "Resíduos domiciliares" },
  { key: "residuoEntulho", label: "Entulho" },
  { key: "residuoMoveis", label: "Móveis ou grandes objetos" },
];

export const ORIGENS: VistoriaCheck[] = [
  { key: "origemResidentes", label: "Moradores e/ou transeuntes" },
  { key: "origemPequenosTransportadores", label: "Pequenos carroceiros" },
  { key: "origemCacambeiros", label: "Caçambeiros / brooks" },
  { key: "origemGrandesTransportadores", label: "Caminhão basculante (grandes volumes)" },
  { key: "origemGrandesGeradores", label: "Material de grande gerador" },
];

export const CONDICOES: VistoriaCheck[] = [
  { key: "riscoAves", label: "Presença de aves" },
  { key: "riscoInsetos", label: "Presença de insetos" },
  { key: "riscoPeconhentos", label: "Animais peçonhentos (cobra, aranha etc.)" },
  { key: "riscoRoedores", label: "Presença de animais roedores" },
  { key: "riscoAgua", label: "Acúmulo de água" },
  { key: "riscoOdor", label: "Mau-cheiro" },
  { key: "riscoQueimada", label: "Vestígio de queimada" },
  { key: "vistoriaErosao", label: "Sinais de erosão do terreno" },
  { key: "vistoriaDanosVia", label: "Danos à calçada e/ou à via" },
  { key: "proximidadeConteiner", label: "Caçamba da Loga" },
];

export const PROXIMIDADES: VistoriaCheck[] = [
  { key: "proximidadePlaca", label: "Placa de proibição de jogar entulho e/ou lixo" },
  { key: "proximidadeCatadores", label: "Circulação de catadoras(es) de recicláveis" },
  { key: "proximidadeCirculacaoRua", label: "Circulação de moradores de rua" },
  { key: "proximidadeFixacaoRua", label: "Fixação/permanência de pessoas em situação de rua" },
];

export const VISTORIA_STEP_COUNT = 7;

const VIRTUAL_KEYS = new Set(["vistoriaErosao", "vistoriaDanosVia"]);

export function isMarked(value: unknown) {
  return value === "Sim." || value === "sim";
}

export function pointIsInactive(record: Pick<Diagnostic, "answers">) {
  return String(record.answers.statusTrimestral ?? "").toLowerCase().includes("inativo");
}

function optionsFor(key: string, version: string) {
  const field = FIELDS.find((item) => item.key === key);
  if (!field) throw new Error(`Campo de vistoria desconhecido: ${key}`);
  return fieldVersion(field, version).options;
}

function yesNoAnswer(key: string, yes: boolean, inactive: boolean, version: string) {
  const options = optionsFor(key, version);
  if (yes) return options.find((option) => option === "Sim.") ?? "Sim.";
  if (inactive) return options.find((option) => option.startsWith("Não se aplica")) ?? "Não.";
  return options.find((option) => option === "Não.") ?? "Não.";
}

export type VistoriaChoice = { id: string; label: string; value: string };

export function activityChoices(version: string): VistoriaChoice[] {
  const options = optionsFor("statusTrimestral", version);
  const inactive = options.find((option) => option.toLowerCase().includes("inativo"));
  const active = options.find((option) => option !== inactive && option.toLowerCase().includes("ativo"));
  if (!inactive || !active) throw new Error("Alternativas de ponto ativo não encontradas.");
  return [
    { id: "sim", label: "Sim", value: active },
    { id: "nao", label: "Não", value: inactive },
  ];
}

export function volumeChoices(version: string): VistoriaChoice[] {
  const options = optionsFor("volume", version);
  const pairs: [string, string][] = [
    ["menos", "Menos de 1 m³"],
    ["entre", "Entre 1 m³ e 5 m³"],
    ["mais", "Mais de 5 m³"],
  ];
  const prefixes = ["Menos", "Entre", "Mais"];
  return pairs.map(([id, label], index) => {
    const value = options.find((option) => option.startsWith(prefixes[index]));
    if (!value) throw new Error("Alternativa de volumetria não encontrada.");
    return { id, label, value };
  });
}

export function impactChoices(key: "impactoPedestres" | "impactoVeiculos", version: string): VistoriaChoice[] {
  const options = optionsFor(key, version);
  const spec: [string, string, (option: string) => boolean][] = [
    ["nao", "Não", (option) => option === "Não."],
    ["parcial", "Sim, parcialmente", (option) => option.startsWith("Sim, parcialmente")],
    ["total", "Sim, totalmente", (option) => option.startsWith("Sim, totalmente")],
    ["inativo", "Inativo", (option) => option.startsWith("Não se aplica")],
  ];
  return spec.map(([id, label, match]) => {
    const value = options.find(match);
    if (!value) throw new Error(`Alternativa de circulação não encontrada em ${key}.`);
    return { id, label, value };
  });
}

export function notApplicable(key: string, version: string) {
  return optionsFor(key, version).find((option) => option.startsWith("Não se aplica")) ?? "";
}

function validDate(value: unknown) {
  const date = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
}

/** Preenche data, sigla e sub-regional sem pedir digitação. Não altera o que a pessoa marcou. */
export function withAutomaticContext(record: Diagnostic): Diagnostic {
  const answers = { ...record.answers };
  if (!validDate(answers.dataChecagem)) answers.dataChecagem = localToday();
  const code = String(answers.codigo ?? record.pointId ?? "").trim().toUpperCase();
  if (code) answers.codigo = code;
  const prefix = code.split("-")[0];
  if (prefix && (answers.sigla === undefined || answers.sigla === "")) {
    const siglas = optionsFor("sigla", record.questionnaireVersion);
    if (siglas.includes(prefix)) answers.sigla = prefix;
  }
  answers.lote = "Lote 3";
  const regional = subregionalIdFromSubprefeitura(String(answers.subprefeitura ?? ""));
  if (regional) answers.subregional = regional;
  else if (answers.subregional !== undefined && !isSubregionalId(answers.subregional)) delete answers.subregional;
  if (answers.vistoriaErosao === undefined && answers.vistoriaDanosVia === undefined && String(answers.riscoErosao ?? "").startsWith("Sim")) {
    answers.vistoriaErosao = "Sim.";
    answers.vistoriaDanosVia = "Sim.";
  }
  return { ...record, answers, pointId: code || record.pointId };
}

/** Status, revitalização, coleta e limpezas saem da situação do ponto e da agenda, sem combo extra. */
export function applyQuarterlyAutomation(record: Diagnostic, automation?: VistoriaAutomation): Diagnostic {
  const answers = { ...record.answers, lote: "Lote 3" };
  const version = record.questionnaireVersion;
  const inactive = pointIsInactive({ answers });
  const revitalizacao = optionsFor("revitalizacao", version);
  const coleta = optionsFor("coleta", version);
  if (inactive) {
    answers.revitalizacao = revitalizacao.find((option) => option.toLowerCase().includes("inativo")) ?? "Não se aplica (inativo).";
    answers.coleta = coleta.find((option) => option.toLowerCase().includes("inativo")) ?? "Não se aplica (inativo).";
    answers.limpezas = 0;
  } else {
    const checkDate = String(answers.dataChecagem ?? "");
    const openDate = automation?.openDate || checkDate;
    const had = pointHadRevitalizacao(String(answers.codigo ?? record.pointId), openDate, checkDate, automation?.events ?? []);
    answers.revitalizacao = had
      ? revitalizacao.find((option) => option.includes("Revitaliza SP")) ?? "Com revitalização vinculada ao Projeto Revitaliza SP."
      : revitalizacao.find((option) => option.startsWith("Sem revitalização")) ?? "Sem revitalização.";
    delete answers.coleta;
    delete answers.limpezas;
  }
  return { ...record, answers };
}

/** Converte a lista da vistoria nas alternativas oficiais. Itens não marcados viram “Não.” */
export function materializeVistoria(record: Diagnostic, automation?: VistoriaAutomation): Diagnostic {
  const base = withAutomaticContext(record);
  const answers = { ...base.answers };
  const inactive = pointIsInactive(base);
  const version = base.questionnaireVersion;
  for (const key of VISTORIA_YES_NO_KEYS) {
    answers[key] = yesNoAnswer(key, isMarked(answers[key]), inactive, version);
  }
  const erosao = isMarked(answers.vistoriaErosao);
  const danos = isMarked(answers.vistoriaDanosVia);
  answers.vistoriaErosao = erosao ? "Sim." : "Não.";
  answers.vistoriaDanosVia = danos ? "Sim." : "Não.";
  answers.riscoErosao = yesNoAnswer("riscoErosao", erosao || danos, inactive, version);
  if (inactive) {
    answers.limpezas = 0;
    const volume = notApplicable("volume", version);
    if (volume) answers.volume = volume;
  }
  for (const key of Object.keys(answers)) {
    if (VIRTUAL_KEYS.has(key)) continue;
    if (answers[key] === "") delete answers[key];
  }
  return applyQuarterlyAutomation({
    ...base,
    answers,
    pointId: String(answers.codigo ?? base.pointId),
    observedStatus: inactive ? "sem-residuos" : "com-residuos",
  }, automation);
}
