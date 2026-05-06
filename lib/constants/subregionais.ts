/** Subregionais operacionais (Zona Norte SP) — usado nos formulários e no gráfico de indicadores. */

export const SUBREGIONAIS = [
  { id: "casa-verde", label: "Casa Verde", abbrev: "CV", color: "#84cc16" },
  { id: "jacana-tremembe", label: "Jaçanã / Tremembé", abbrev: "JT", color: "#1e3a5f" },
  {
    id: "vila-maria-guilherme",
    label: "Vila Maria / Vila Guilherme",
    abbrev: "MG",
    color: "#06b6d4",
  },
  { id: "santana-tucuruvi", label: "Santana / Tucuruvi", abbrev: "ST", color: "#ca8a04" },
  { id: "interno", label: "Interno (garagem / reuniões)", abbrev: "INT", color: "#71717a" },
] as const;

export type SubregionalId = (typeof SUBREGIONAIS)[number]["id"];

const ID_SET = new Set<string>(SUBREGIONAIS.map((s) => s.id));

export function isSubregionalId(v: unknown): v is SubregionalId {
  return typeof v === "string" && ID_SET.has(v);
}

export function subregionalMeta(id: SubregionalId | undefined) {
  if (!id) {
    return {
      label: "Não informado",
      abbrev: "—",
      color: "#a3a3a3",
    };
  }
  const hit = SUBREGIONAIS.find((s) => s.id === id);
  return {
    label: hit?.label ?? id,
    abbrev: hit?.abbrev ?? "?",
    color: hit?.color ?? "#a3a3a3",
  };
}

/** Texto vindo de `features-PV.json` → id usado na agenda e nos Indicadores. */
const SUBPREFEITURA_TO_ID: Record<string, SubregionalId> = {
  "Casa Verde/Cachoeirinha": "casa-verde",
  "Jaçanã/Tremembé": "jacana-tremembe",
  "Santana/Tucuruvi": "santana-tucuruvi",
  "Vila Maria/Vila Guilherme": "vila-maria-guilherme",
};

export function subregionalIdFromSubprefeitura(raw: string): SubregionalId | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  return SUBPREFEITURA_TO_ID[t];
}
