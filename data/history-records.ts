/** Registo de histórico (coleção Firestore `historyRecords`). */

export type HistoryRecord = {
  id: number;
  title: string;
  type: string;
  status: string;
  date: string;
  time: string;
  location: string;
  responsible: string;
  description: string;
  observations: string;
  photos: number;
  linksPostagem?: string[];
  equipe?: string;
  panfletosDistribuidos?: number;
  locaisAtendidos?: string;
};

export type HistoryRecordDoc = HistoryRecord & {
  extraPhotoUrls?: string[];
};

export const HISTORY_SEED: HistoryRecord[] = [
  {
    id: 1,
    title: "Revitalização Praça Central",
    type: "revitalizacao",
    status: "concluido",
    date: "2026-04-21",
    time: "08:00 - 12:00",
    location: "Praça da República - Centro",
    responsible: "Igor Supervisor",
    description:
      "Plantio de 50 mudas, poda de árvores existentes, limpeza geral da área",
    observations: "Ação bem sucedida. Comunidade participou ativamente.",
    photos: 12,
    linksPostagem: ["https://www.instagram.com/explore/tags/revitalizacao"],
  },
  {
    id: 2,
    title: "Vistoria Ecoponto Zona Norte",
    type: "vistoria",
    status: "concluido",
    date: "2026-04-20",
    time: "14:00 - 16:00",
    location: "R. Industrial, 890 - Zona Norte",
    responsible: "Maria",
    description:
      "Verificação de condições operacionais e capacidade de armazenamento",
    observations: "Necessita ampliação. Relatório enviado à coordenação.",
    photos: 5,
  },
  {
    id: 3,
    title: "Limpeza Ponto Viciado R. Silva Jardim",
    type: "limpeza",
    status: "parcial",
    date: "2026-04-18",
    time: "09:00 - 11:30",
    location: "R. Silva Jardim, 450 - Centro",
    responsible: "Luciana",
    description: "Remoção de entulho e resíduos acumulados",
    observations:
      "Limpeza realizada mas local é reincidente. Necessita fiscalização intensiva.",
    photos: 8,
  },
  {
    id: 4,
    title: "Ação Educativa Escola Municipal",
    type: "acao-ambiental",
    status: "concluido",
    date: "2026-04-19",
    time: "08:30 - 11:30",
    location: "Escola Mun. Nova Esperança",
    responsible: "Maria",
    description: "Palestra sobre reciclagem e descarte correto para 120 alunos",
    observations: "Grande engajamento dos alunos. Escola solicitou nova visita.",
    photos: 15,
  },
  {
    id: 5,
    title: "Fiscalização Setor Industrial",
    type: "fiscalizacao",
    status: "concluido",
    date: "2026-04-17",
    time: "09:00 - 12:00",
    location: "R. Industrial, 500-800",
    responsible: "Igor Supervisor",
    description: "Fiscalização após denúncia de descarte irregular",
    observations: "Identificada empresa responsável. Auto de infração emitido.",
    photos: 10,
    linksPostagem: ["https://facebook.com"],
  },
  {
    id: 6,
    title: "Visita Técnica UBS Centro",
    type: "visita-tecnica",
    status: "concluido",
    date: "2026-04-15",
    time: "10:00 - 11:00",
    location: "Av. Principal, 450 - Centro",
    responsible: "Luciana",
    description:
      "Avaliação de condições sanitárias e descarte de resíduos hospitalares",
    observations: "Tudo em conformidade. Próxima visita agendada para maio.",
    photos: 4,
  },
  {
    id: 7,
    title: "Reunião Comunitária - Bairro Jardim",
    type: "visita-institucional",
    status: "concluido",
    date: "2026-04-14",
    time: "19:00 - 21:00",
    location: "Centro Comunitário Jardim",
    responsible: "Igor Supervisor",
    description: "Apresentação do programa de conscientização ambiental",
    observations: "Aproximadamente 40 moradores presentes. Boa receptividade.",
    photos: 6,
  },
  {
    id: 8,
    title: "Limpeza Área Crítica Marginal",
    type: "limpeza",
    status: "cancelado",
    date: "2026-04-12",
    time: "08:00 - 12:00",
    location: "Av. Marginal, km 5",
    responsible: "Igor Supervisor",
    description: "Ação de limpeza planejada",
    observations: "Cancelada devido a condições climáticas adversas. Reagendada.",
    photos: 0,
  },
  {
    id: 9,
    title: "Panfletagem — Conscientização descarte correto",
    type: "panfletagem",
    status: "concluido",
    date: "2026-04-16",
    time: "08:00 - 13:00",
    location: "Praça da República e entorno — Centro",
    responsible: "Igor Supervisor",
    description:
      "Distribuição de material informativo sobre ecopontos, horários de coleta e coleta seletiva.",
    observations:
      "Alto fluxo na feira livre; equipe sugeriu reforço mensal no local.",
    photos: 18,
    equipe: "Equipe Comunicação, Maria e 3 voluntários",
    panfletosDistribuidos: 1200,
    locaisAtendidos:
      "Praça da República, feira livre (rua auxiliar), UBS Centro, 6 estabelecimentos do comércio local",
    linksPostagem: ["https://instagram.com", "https://facebook.com"],
  },
];
