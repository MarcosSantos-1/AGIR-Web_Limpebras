/** Álbuns da galeria (coleção Firestore `galeriaSets`). */

export type GaleriaPhoto = {
  id: number;
  type: string;
  color: string;
  url?: string;
};

export type GaleriaSetDoc = {
  id: number;
  title: string;
  type: string;
  location: string;
  date: string;
  responsible: string;
  photos: GaleriaPhoto[];
  /** Notas do formulário (ActionCompletion) */
  registroDescription?: string;
  registroObservations?: string;
  registroPhotoUrls?: string[];
};

export const GALERIA_SEED: Omit<
  GaleriaSetDoc,
  "registroDescription" | "registroObservations" | "registroPhotoUrls"
>[] = [
  {
    id: 1,
    title: "Revitalização Praça Central",
    type: "antes-depois",
    location: "Praça da República - Centro",
    date: "2026-04-21",
    responsible: "Igor Supervisor",
    photos: [
      { id: 1, type: "antes", color: "bg-zinc-300" },
      { id: 2, type: "depois", color: "bg-emerald-200" },
    ],
  },
  {
    id: 2,
    title: "Limpeza Ponto Viciado R. Silva Jardim",
    type: "antes-depois",
    location: "R. Silva Jardim, 450",
    date: "2026-04-18",
    responsible: "Luciana",
    photos: [
      { id: 3, type: "antes", color: "bg-red-200" },
      { id: 4, type: "depois", color: "bg-green-200" },
    ],
  },
  {
    id: 3,
    title: "Vistoria Ecoponto Zona Norte",
    type: "por-acao",
    location: "R. Industrial, 890",
    date: "2026-04-20",
    responsible: "Maria",
    photos: [
      { id: 5, type: "vistoria", color: "bg-blue-200" },
      { id: 6, type: "vistoria", color: "bg-blue-100" },
      { id: 7, type: "vistoria", color: "bg-blue-200" },
    ],
  },
  {
    id: 4,
    title: "Ação Educativa Escola Municipal",
    type: "por-acao",
    location: "Escola Mun. Nova Esperança",
    date: "2026-04-19",
    responsible: "Maria",
    photos: [
      { id: 8, type: "evento", color: "bg-violet-200" },
      { id: 9, type: "evento", color: "bg-violet-100" },
      { id: 10, type: "evento", color: "bg-violet-200" },
      { id: 11, type: "evento", color: "bg-violet-100" },
    ],
  },
  {
    id: 5,
    title: "Fiscalização Setor Industrial",
    type: "por-acao",
    location: "R. Industrial, 500-800",
    date: "2026-04-17",
    responsible: "Igor Supervisor",
    photos: [
      { id: 12, type: "fiscalizacao", color: "bg-amber-200" },
      { id: 13, type: "fiscalizacao", color: "bg-amber-100" },
    ],
  },
  {
    id: 6,
    title: "Área Crítica Marginal - Progresso",
    type: "antes-depois",
    location: "Av. Marginal, km 5",
    date: "2026-04-15",
    responsible: "Igor Supervisor",
    photos: [
      { id: 14, type: "antes", color: "bg-red-300" },
      { id: 15, type: "durante", color: "bg-amber-200" },
      { id: 16, type: "depois", color: "bg-green-200" },
    ],
  },
];
