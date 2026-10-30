import metadata from "@/data/diagnosticos/fields.json";

const QUESTIONNAIRE_VERSION = "2026-T3-rev-20261019";
type Answer = string | number;
type FieldMeta = { key: string; type: string; versions: Record<string, { options: string[] }> };
const FIELDS = metadata as FieldMeta[];

function fieldOptions(key: string, version: string) {
  const field = FIELDS.find((item) => item.key === key);
  if (!field || field.type !== "select") return [];
  return (field.versions[version] ?? field.versions[QUESTIONNAIRE_VERSION])?.options ?? [];
}

export const FICHA_ANSWER_KEYS = [
  "complemento",
  "tipoLogradouro",
  "outroLogradouro",
  "topografia",
  "ocupacao",
  "entornoBueiro",
  "entornoRio",
  "entornoEncosta",
  "entornoTerreno",
  "entornoSemSaida",
  "entornoMuro",
] as const;

export type FichaAnswerKey = (typeof FICHA_ANSWER_KEYS)[number];

export const ENTORNO_FIELDS: { key: FichaAnswerKey; label: string }[] = [
  { key: "entornoBueiro", label: "Bocas de lobo em até 15 m" },
  { key: "entornoRio", label: "Córrego ou rio" },
  { key: "entornoEncosta", label: "Encosta ou morro" },
  { key: "entornoTerreno", label: "Terreno baldio" },
  { key: "entornoSemSaida", label: "Rua sem saída" },
  { key: "entornoMuro", label: "Gradeado e/ou muro cego" },
];

export type PontoFichaDraft = Record<FichaAnswerKey, string>;

export type FichaPart = "via" | "terreno" | "entorno";

export const FICHA_PARTS: FichaPart[] = ["via", "terreno", "entorno"];

const PART_KEYS: Record<FichaPart, FichaAnswerKey[]> = {
  via: ["complemento", "tipoLogradouro", "outroLogradouro"],
  terreno: ["topografia", "ocupacao"],
  entorno: ENTORNO_FIELDS.map((field) => field.key),
};

export function emptyFichaDraft(): PontoFichaDraft {
  return {
    complemento: "",
    tipoLogradouro: "",
    outroLogradouro: "",
    topografia: "",
    ocupacao: "",
    entornoBueiro: "",
    entornoRio: "",
    entornoEncosta: "",
    entornoTerreno: "",
    entornoSemSaida: "",
    entornoMuro: "",
  };
}

export function fichaOptions(key: FichaAnswerKey, version = QUESTIONNAIRE_VERSION) {
  return fieldOptions(key, version);
}

export function fichaChoiceLabel(key: FichaAnswerKey, option: string) {
  if (key === "tipoLogradouro") {
    if (option.startsWith("Via")) return "Via trafegável";
    if (option.startsWith("Beco")) return "Beco, escadaria ou viela";
    return "Outros";
  }
  if (key === "topografia") return option.startsWith("Plana") ? "Plana" : "Inclinada";
  if (key === "ocupacao" || option === "Sim." || option === "Não.") return option.replace(/\.$/, "");
  return option;
}

export function fichaDraftFromAnswers(answers: Record<string, Answer | undefined> | undefined): PontoFichaDraft {
  const draft = emptyFichaDraft();
  if (!answers) return draft;
  for (const key of FICHA_ANSWER_KEYS) {
    const value = answers[key];
    if (value !== undefined && value !== null) draft[key] = String(value);
  }
  return draft;
}

export function isOutrosLogradouro(value: string) {
  return value.startsWith("Outros");
}

export function fichaErrors(draft: PontoFichaDraft, version = QUESTIONNAIRE_VERSION): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!fichaOptions("tipoLogradouro", version).includes(draft.tipoLogradouro)) errors.tipoLogradouro = "Escolha o tipo de logradouro.";
  if (isOutrosLogradouro(draft.tipoLogradouro) && !draft.outroLogradouro.trim()) errors.outroLogradouro = "Descreva o que é esse outro tipo de logradouro.";
  if (!fichaOptions("topografia", version).includes(draft.topografia)) errors.topografia = "Escolha a topografia.";
  if (!fichaOptions("ocupacao", version).includes(draft.ocupacao)) errors.ocupacao = "Escolha o perfil de ocupação.";
  for (const field of ENTORNO_FIELDS) {
    if (!fichaOptions(field.key, version).includes(draft[field.key])) errors[field.key] = `Diga se existe: ${field.label}.`;
  }
  return errors;
}

export function fichaPartError(draft: PontoFichaDraft, part: FichaPart, version = QUESTIONNAIRE_VERSION) {
  const errors = fichaErrors(draft, version);
  const keys = PART_KEYS[part];
  return keys.map((key) => errors[key]).find(Boolean) ?? "";
}

export function fichaLockedKeys(draft: PontoFichaDraft, version = QUESTIONNAIRE_VERSION) {
  const errors = fichaErrors(draft, version);
  const locked = new Set<FichaAnswerKey>();
  for (const key of FICHA_ANSWER_KEYS) {
    if (key === "outroLogradouro") continue;
    if (!errors[key] && draft[key].trim()) locked.add(key);
  }
  if (isOutrosLogradouro(draft.tipoLogradouro) && !errors.outroLogradouro && draft.outroLogradouro.trim()) locked.add("outroLogradouro");
  return locked;
}

export function answersFromFicha(draft: PontoFichaDraft): Record<string, Answer> {
  const answers: Record<string, Answer> = {};
  for (const key of FICHA_ANSWER_KEYS) {
    const value = draft[key].trim();
    if (!value) continue;
    if (key === "outroLogradouro" && !isOutrosLogradouro(draft.tipoLogradouro)) continue;
    answers[key] = key === "complemento" || key === "outroLogradouro" ? value : draft[key];
  }
  answers.lote = "Lote 3";
  return answers;
}

/** Copia a ficha para as respostas. `overwrite` troca o que já veio da planilha; `fill-empty` só completa buracos. */
export function overlayFichaAnswers(answers: Record<string, Answer>, ficha: PontoFichaDraft | null | undefined, mode: "overwrite" | "fill-empty") {
  const next = { ...answers, lote: "Lote 3" as Answer };
  if (!ficha) return next;
  for (const [key, value] of Object.entries(answersFromFicha(ficha))) {
    if (key === "lote" || value === "") continue;
    if (mode === "overwrite" || next[key] === undefined || next[key] === "") next[key] = value;
  }
  if (next.tipoLogradouro && !isOutrosLogradouro(String(next.tipoLogradouro))) delete next.outroLogradouro;
  return next;
}
