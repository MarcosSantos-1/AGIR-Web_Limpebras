/**
 * Solicitações recebidas pelo canal de WhatsApp do departamento de comunicação.
 *
 * Substitui as "conversas de corredor": tudo o que entra pelo bot fica registado
 * aqui com protocolo, prazo e urgência declarados pelo solicitante.
 */

export const SOLICITACOES_COLLECTION = "solicitacoes";

export type SolicitacaoTipo =
  | "arte-grafica"
  | "campanha"
  | "mural"
  | "prefeitura"
  | "cobertura-evento"
  | "redes-sociais"
  | "outro";

export type SolicitacaoStatus =
  | "nova"
  | "em_andamento"
  | "concluida"
  | "recusada";

export type SolicitacaoPrazoTipo = "hoje" | "semana" | "data" | "sem_prazo";

export type SolicitacaoUrgencia = "alta" | "media" | "baixa";

export type SolicitacaoCanal = "whatsapp";

export type Solicitacao = {
  /** ID do documento no Firestore. */
  id: string;
  /** Identificador legível partilhado com o solicitante (ex.: SOL-2026-0042). */
  protocolo: string;
  tipo: SolicitacaoTipo;
  descricao: string;
  prazoTipo: SolicitacaoPrazoTipo;
  /** `yyyy-MM-dd`, apenas quando `prazoTipo === "data"`. */
  prazoData?: string;
  urgencia: SolicitacaoUrgencia;
  solicitanteNome: string;
  solicitanteSetor: string;
  /** Telefone internacional sem "+" (ex.: 5511964821876). */
  solicitanteTelefone: string;
  canal: SolicitacaoCanal;
  status: SolicitacaoStatus;
  /** UID de quem assumiu a solicitação no AGIR. */
  responsavelUid?: string;
  responsavelNome?: string;
  /** Nota interna da comunicação ao concluir ou recusar. */
  respostaInterna?: string;
  createdAtMs: number;
  updatedAtMs?: number;
};

export const SOLICITACAO_TIPO_LABELS: Record<SolicitacaoTipo, string> = {
  "arte-grafica": "Arte gráfica",
  campanha: "Campanha",
  mural: "Mural",
  prefeitura: "Solicitação da Prefeitura",
  "cobertura-evento": "Cobertura de evento",
  "redes-sociais": "Redes sociais",
  outro: "Outro",
};

export const SOLICITACAO_STATUS_LABELS: Record<SolicitacaoStatus, string> = {
  nova: "Nova",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  recusada: "Recusada",
};

export const SOLICITACAO_URGENCIA_LABELS: Record<SolicitacaoUrgencia, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const SOLICITACAO_TIPO_IDS = Object.keys(
  SOLICITACAO_TIPO_LABELS,
) as SolicitacaoTipo[];

export const SOLICITACAO_STATUS_IDS = Object.keys(
  SOLICITACAO_STATUS_LABELS,
) as SolicitacaoStatus[];

export function isSolicitacaoTipo(value: string): value is SolicitacaoTipo {
  return Object.hasOwn(SOLICITACAO_TIPO_LABELS, value);
}

export function isSolicitacaoStatus(value: string): value is SolicitacaoStatus {
  return Object.hasOwn(SOLICITACAO_STATUS_LABELS, value);
}

export function solicitacaoTipoLabel(tipo: SolicitacaoTipo): string {
  return SOLICITACAO_TIPO_LABELS[tipo] ?? tipo;
}

export function solicitacaoStatusLabel(status: SolicitacaoStatus): string {
  return SOLICITACAO_STATUS_LABELS[status] ?? status;
}

export function solicitacaoUrgenciaLabel(urgencia: SolicitacaoUrgencia): string {
  return SOLICITACAO_URGENCIA_LABELS[urgencia] ?? urgencia;
}

/** Texto curto de prazo para listas e resumos ("Hoje", "Até 04/09", ...). */
export function solicitacaoPrazoLabel(
  prazoTipo: SolicitacaoPrazoTipo,
  prazoData?: string,
): string {
  if (prazoTipo === "hoje") return "Para hoje";
  if (prazoTipo === "semana") return "Esta semana";
  if (prazoTipo === "sem_prazo") return "Sem prazo definido";
  if (!prazoData) return "Data a definir";
  const [year, month, day] = prazoData.split("-");
  if (!year || !month || !day) return prazoData;
  return `Até ${day}/${month}/${year}`;
}

/** Solicitações abertas são as que ainda exigem ação da comunicação. */
export function isSolicitacaoAberta(status: SolicitacaoStatus): boolean {
  return status === "nova" || status === "em_andamento";
}

const URGENCIA_WEIGHT: Record<SolicitacaoUrgencia, number> = {
  alta: 0,
  media: 1,
  baixa: 2,
};

/** Urgência primeiro, depois a mais recente — ordem usada no menu e na página. */
export function sortSolicitacoes(a: Solicitacao, b: Solicitacao): number {
  const byUrgencia = URGENCIA_WEIGHT[a.urgencia] - URGENCIA_WEIGHT[b.urgencia];
  if (byUrgencia !== 0) return byUrgencia;
  return b.createdAtMs - a.createdAtMs;
}

export type SolicitacaoAccent = {
  borderClass: string;
  dotClass: string;
  badgeClass: string;
};

export function solicitacaoUrgenciaAccent(
  urgencia: SolicitacaoUrgencia,
): SolicitacaoAccent {
  if (urgencia === "alta") {
    return {
      borderClass: "border-l-red-500",
      dotClass: "bg-red-500",
      badgeClass:
        "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400",
    };
  }
  if (urgencia === "media") {
    return {
      borderClass: "border-l-amber-500",
      dotClass: "bg-amber-500",
      badgeClass:
        "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    };
  }
  return {
    borderClass: "border-l-zinc-400",
    dotClass: "bg-zinc-400",
    badgeClass:
      "bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300",
  };
}

export function solicitacaoStatusBadgeClass(status: SolicitacaoStatus): string {
  const map: Record<SolicitacaoStatus, string> = {
    nova: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    em_andamento:
      "bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
    concluida:
      "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    recusada:
      "bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300",
  };
  return map[status];
}

/** `5511964821876` → `+55 11 96482-1876` (fallback: devolve o original). */
export function formatWhatsAppPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const br = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(digits);
  if (br) return `+55 ${br[1]} ${br[2]}-${br[3]}`;
  return raw.startsWith("+") ? raw : `+${digits}`;
}
