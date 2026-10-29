/** Campos que a vistoria em campo pergunta ou grava. O restante da planilha fica automático ou em branco. */
export const VISTORIA_YES_NO_KEYS = [
  "residuoDomiciliar",
  "residuoEntulho",
  "residuoMoveis",
  "origemResidentes",
  "origemPequenosTransportadores",
  "origemCacambeiros",
  "origemGrandesTransportadores",
  "origemGrandesGeradores",
  "riscoAves",
  "riscoInsetos",
  "riscoPeconhentos",
  "riscoRoedores",
  "riscoAgua",
  "riscoOdor",
  "riscoQueimada",
  "proximidadePlaca",
  "proximidadeCatadores",
  "proximidadeCirculacaoRua",
  "proximidadeFixacaoRua",
] as const;

export const VISTORIA_CHOICE_KEYS = ["statusTrimestral", "volume", "impactoPedestres", "impactoVeiculos"] as const;

/** Selects que a pessoa escolhe na vistoria. Fora desta lista, um valor histórico inalterado pode permanecer. */
export const VISTORIA_REVIEW_KEYS = new Set<string>([...VISTORIA_YES_NO_KEYS, ...VISTORIA_CHOICE_KEYS, "riscoErosao"]);
