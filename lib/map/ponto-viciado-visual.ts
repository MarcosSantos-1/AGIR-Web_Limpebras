import type { MapaStatus } from "@/lib/map-features";

/** Faixa visual de um ponto viciado. A ordem de classificação é fixa. */
export type PvFaixa =
  | "inativo"
  | "revitalizado"
  | "acima-5"
  | "entre-1-e-5"
  | "ate-1";

export const PV_FAIXA_VISUAL: Record<
  PvFaixa,
  {
    hex: string;
    tailwindBg: string;
    tailwindText: string;
    label: string;
    shortLabel: string;
  }
> = {
  inativo: {
    hex: "#71717a",
    tailwindBg: "bg-zinc-500",
    tailwindText: "text-zinc-500 dark:text-zinc-400",
    label: "Ponto viciado (inativo)",
    shortLabel: "Inativos",
  },
  revitalizado: {
    hex: "#059669",
    tailwindBg: "bg-emerald-600",
    tailwindText: "text-emerald-600 dark:text-emerald-400",
    label: "Ponto viciado (revitalizado)",
    shortLabel: "Revitalizados",
  },
  "acima-5": {
    hex: "#171717",
    tailwindBg: "bg-neutral-900",
    tailwindText: "text-neutral-900 dark:text-neutral-100",
    label: "Ponto viciado · acima de 5 m³",
    shortLabel: "Acima de 5 m³",
  },
  "entre-1-e-5": {
    hex: "#ef4444",
    tailwindBg: "bg-red-500",
    tailwindText: "text-red-500 dark:text-red-400",
    label: "Ponto viciado · 1 a 5 m³",
    shortLabel: "De 1 a 5 m³",
  },
  "ate-1": {
    hex: "#f97316",
    tailwindBg: "bg-orange-500",
    tailwindText: "text-orange-500 dark:text-orange-400",
    label: "Ponto viciado · até 1 m³",
    shortLabel: "Até 1 m³",
  },
};

/** Visíveis ao ligar a camada: ativos, não revitalizados, até 5 m³. */
export const PV_DEFAULT_FAIXAS: PvFaixa[] = ["ate-1", "entre-1-e-5"];

/** Subfiltros, desligados até o utilizador marcar. */
export const PV_SUBFILTER_FAIXAS: PvFaixa[] = [
  "acima-5",
  "revitalizado",
  "inativo",
];

function volumetriaInativa(volumetria: string): boolean {
  return (
    volumetria.includes("inativ") ||
    volumetria.includes("não se aplica") ||
    volumetria.includes("nao se aplica")
  );
}

/**
 * Inativo ganha de tudo. Revitalização (catálogo ou concluída no sistema)
 * ganha da volumetria. Sem volumetria cai em até 1 m³.
 */
export function classifyPontoViciado(input: {
  status?: MapaStatus;
  volumetria?: string | null;
  revitalizadoNoSistema?: boolean;
}): PvFaixa {
  const vol = (input.volumetria ?? "").trim().toLowerCase();
  const revitalizado =
    input.status === "resolvido" || input.revitalizadoNoSistema === true;

  if (input.status === "inativo") return "inativo";
  if (revitalizado) return "revitalizado";
  if (volumetriaInativa(vol)) return "inativo";
  if (vol.includes("mais de 5") || vol.includes("acima de 5")) return "acima-5";
  if (vol.includes("entre 1")) return "entre-1-e-5";
  return "ate-1";
}
