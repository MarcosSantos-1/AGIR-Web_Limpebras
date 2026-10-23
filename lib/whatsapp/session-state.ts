import type {
  SolicitacaoPrazoTipo,
  SolicitacaoTipo,
  SolicitacaoUrgencia,
} from "@/data/solicitacoes";

/** Passo em que a conversa está — determina como interpretar a próxima mensagem. */
export type FlowStep =
  | "aguardando_tipo"
  | "aguardando_descricao"
  | "aguardando_prazo"
  | "aguardando_data"
  | "aguardando_urgencia"
  | "aguardando_nome"
  | "aguardando_setor"
  | "aguardando_confirmacao";

export type SolicitacaoDraft = {
  tipo?: SolicitacaoTipo;
  descricao?: string;
  prazoTipo?: SolicitacaoPrazoTipo;
  prazoData?: string;
  urgencia?: SolicitacaoUrgencia;
  nome?: string;
  setor?: string;
};

export type WhatsAppSession = {
  step: FlowStep;
  draft: SolicitacaoDraft;
  updatedAtMs: number;
};

/** Conversas paradas há mais de 30 minutos recomeçam do menu inicial. */
export const SESSION_TTL_MS = 30 * 60 * 1000;

export function isSessionExpired(
  session: WhatsAppSession,
  nowMs = Date.now(),
): boolean {
  return nowMs - session.updatedAtMs > SESSION_TTL_MS;
}
