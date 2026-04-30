/**
 * Dados de conteúdo para redes sociais (mock — persistência em etapa seguinte).
 */

export type SocialContentStatus =
  | "ideia"
  | "rascunho"
  | "agendado"
  | "publicado";

export type SocialContentTipo = "Post" | "Reel" | "Story";

export interface SocialPostPhoto {
  id: number;
  type?: string;
  color: string;
  /** URL no Firebase Storage após upload */
  url?: string;
}

export interface SocialPost {
  id: number;
  status: SocialContentStatus;
  date: string;
  tipo: SocialContentTipo;
  tema: string;
  responsavel: string;
  linkOuArquivo: string | null;
  /** Rascunho / material de apoio (PDF, planilha, pasta) */
  linkOuArquivoLabel?: string;
  /** Só publicado */
  legenda?: string;
  linkPost?: string;
  visualizacoes?: number;
  curtidas?: number;
  compartilhamentos?: number;
  /** Última coleta de métricas (acompanhamento) */
  metricasAtualizadasEm?: string;
  /** Ideia ainda sem peça (só planejamento) */
  ideiaResumo?: string;
  notasProducao?: string;
  fotos: SocialPostPhoto[];
}

export const socialPosts: SocialPost[] = [
  {
    id: 101,
    status: "ideia",
    date: "—",
    tipo: "Reel",
    tema: "Série: mitos e verdades do descarte de pilhas",
    responsavel: "Maria",
    linkOuArquivo: null,
    ideiaResumo:
      "Roteiro com 5 mitos; gravação no ecoponto; duração ~45s. Aguardar liberação de pauta.",
    notasProducao: "Referência: material da campanha nacional 2024.",
    fotos: [{ id: 1, color: "bg-zinc-200" }],
  },
  {
    id: 102,
    status: "ideia",
    date: "—",
    tipo: "Post",
    tema: "Calendário de coleta por bairro — carrossel estático",
    responsavel: "Luciana",
    linkOuArquivo: null,
    ideiaResumo: "Tabela simplificada + CTA para o site da prefeitura.",
    fotos: [],
  },
  {
    id: 1,
    status: "agendado",
    date: "2026-04-22",
    tipo: "Reel",
    tema: "Dicas de descarte correto — Ecoponto",
    responsavel: "Maria",
    linkOuArquivo: null,
    notasProducao: "Legenda: lista de frases aprovada pelo jurídico (v0.2).",
    fotos: [
      { id: 2, color: "bg-violet-200" },
      { id: 3, color: "bg-violet-100" },
    ],
  },
  {
    id: 2,
    status: "rascunho",
    date: "2026-04-23",
    tipo: "Post",
    tema: "Campanha de conscientização — carrossel",
    responsavel: "Luciana",
    linkOuArquivo: "https://example.com/rascunho-carrossel.pdf",
    linkOuArquivoLabel: "PDF do carrossel (rascunho)",
    legenda: "(em revisão) Separe, descarte, repita! ♻️ Dicas rápidas no carrossel.",
    fotos: [
      { id: 4, color: "bg-amber-100" },
      { id: 5, color: "bg-amber-200" },
    ],
  },
  {
    id: 3,
    status: "publicado",
    date: "2026-04-20",
    tipo: "Story",
    tema: "Bastidores da ação no bairro Jardim",
    responsavel: "Igor Supervisor",
    linkOuArquivo: null,
    linkPost: "https://instagram.com",
    legenda: "Bastidores da ação de hoje no Jardim — equipe no terreno! 🌿 #AGIR",
    visualizacoes: 1240,
    curtidas: 86,
    compartilhamentos: 12,
    metricasAtualizadasEm: "21/04/2026 — 18:42",
    fotos: [
      { id: 6, color: "bg-sky-200" },
      { id: 7, color: "bg-sky-100" },
    ],
  },
  {
    id: 4,
    status: "agendado",
    date: "2026-04-25",
    tipo: "Post",
    tema: "Resultados da revitalização — antes e depois",
    responsavel: "Maria",
    linkOuArquivo: null,
    fotos: [
      { id: 8, color: "bg-emerald-200" },
      { id: 9, color: "bg-emerald-100" },
    ],
  },
  {
    id: 5,
    status: "publicado",
    date: "2026-04-18",
    tipo: "Post",
    tema: "Antes e depois — Praça Central",
    responsavel: "Igor Supervisor",
    linkOuArquivo: null,
    linkPost: "https://facebook.com",
    legenda: "A praça de hoje! Antes/depois de mais uma revitalização concluída com a comunidade.",
    visualizacoes: 8420,
    curtidas: 512,
    compartilhamentos: 89,
    metricasAtualizadasEm: "22/04/2026 — 09:15",
    fotos: [
      { id: 10, color: "bg-zinc-300" },
      { id: 11, color: "bg-emerald-200" },
    ],
  },
  {
    id: 6,
    status: "rascunho",
    date: "2026-04-26",
    tipo: "Reel",
    tema: "Entrevista com educador ambiental (teaser 15s)",
    responsavel: "Luciana",
    linkOuArquivo: "https://example.com/corte-v1.mp4",
    linkOuArquivoLabel: "Corte bruto (v1)",
    fotos: [{ id: 12, color: "bg-rose-100" }],
  },
];

const DASHBOARD_SOCIAL_COUNT = 4;

export function getDashboardSocialPosts(): SocialPost[] {
  return socialPosts.slice(0, DASHBOARD_SOCIAL_COUNT);
}
