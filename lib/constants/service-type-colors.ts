/**
 * Cores oficiais por tipo de serviço (histórico, agenda, badges).
 * Tipos sem entrada explícita usam cinza.
 */
export const SERVICE_TYPE_HEX: Record<string, string> = {
  revitalizacao: "#8e51ff",
  "visita-tecnica": "#2b7fff",
  reuniao: "#fe9a00",
  "visita-institucional": "#fe9a00",
  panfletagem: "#fb2c36",
  fiscalizacao: "#ff6900",
  vistoria: "#00b8db",
  "acao-ambiental": "#00c950",
  limpeza: "#71717a",
  "coleta-seletiva": "#71717a",
  capacitacao: "#71717a",
  outro: "#71717a",
  all: "#71717a",
};

export function serviceTypeColor(type: string): string {
  return SERVICE_TYPE_HEX[type] ?? "#71717a";
}
