import type { AgendaEvent, AgendaEventStatus, AgendaEventType } from "@/data/agenda-events";
import { agendaEventUrl } from "@/data/agenda-events";
import type { SocialContentStatus, SocialPost } from "@/data/social-posts";
import { firstTokenFromPersonLabel } from "@/lib/auth/responsible-default";
import { format, parse } from "date-fns";

export type NotificationKind = "agenda" | "social";

export type NotificationAccent = {
  borderClass: string;
  dotClass: string;
  categoryLabel: string;
};

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  subtitle?: string;
  statusLabel: string;
  /** Primeiro nome de quem registou / é responsável (texto bold ao lado do estado). */
  actorFirstName: string;
  sortKey: number;
  accent: NotificationAccent;
  href?: string;
};

/** `yyyy-MM-dd` → `dd/MM/yyyy` (fuso local). */
export function formatNotificationDateBr(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const d = parse(ymd, "yyyy-MM-dd", new Date());
  if (Number.isNaN(d.getTime())) return ymd;
  return format(d, "dd/MM/yyyy");
}

function agendaTypeShortLabel(type: AgendaEventType): string {
  const map: Record<AgendaEventType, string> = {
    revitalizacao: "Revitalização",
    "visita-tecnica": "Visita técnica",
    "visita-institucional": "Visita institucional",
    "acao-ambiental": "Ação ambiental",
    reuniao: "Reunião",
    fiscalizacao: "Fiscalização",
    vistoria: "Vistoria",
    panfletagem: "Panfletagem",
    evento: "Evento",
  };
  return map[type] ?? type;
}

function agendaStatusLabel(s: AgendaEventStatus): string {
  const map: Record<AgendaEventStatus, string> = {
    pendente: "Pendente",
    concluido: "Concluído",
    reagendado: "Reagendado",
    cancelado: "Cancelado",
  };
  return map[s] ?? s;
}

function socialStatusLabel(s: SocialContentStatus): string {
  const map: Record<SocialContentStatus, string> = {
    ideia: "Ideia",
    rascunho: "Rascunho",
    agendado: "Agendado",
    publicado: "Publicado",
  };
  return map[s] ?? s;
}

function accentForAgenda(type: AgendaEventType): NotificationAccent {
  if (type === "revitalizacao") {
    return {
      borderClass: "border-l-blue-500",
      dotClass: "bg-blue-500",
      categoryLabel: "Agenda · Revitalização",
    };
  }
  if (type === "panfletagem") {
    return {
      borderClass: "border-l-amber-500",
      dotClass: "bg-amber-500",
      categoryLabel: "Agenda · Panfletagem",
    };
  }
  return {
    borderClass: "border-l-fuchsia-500",
    dotClass: "bg-gradient-to-r from-[#f318e3] to-[#6a0eaf]",
    categoryLabel: `Agenda · ${agendaTypeShortLabel(type)}`,
  };
}

function accentForSocial(tipo: SocialPost["tipo"], status: SocialPost["status"]): NotificationAccent {
  const base =
    tipo === "Reel"
      ? {
          borderClass: "border-l-violet-500",
          dotClass: "bg-violet-500",
        }
      : tipo === "Story"
        ? {
            borderClass: "border-l-teal-500",
            dotClass: "bg-teal-500",
          }
        : {
            borderClass: "border-l-emerald-500",
            dotClass: "bg-emerald-500",
          };

  const statusHue =
    status === "publicado"
      ? " · Publicado"
      : status === "agendado"
        ? " · Agendado"
        : status === "rascunho"
          ? " · Rascunho"
          : " · Ideia";

  return {
    ...base,
    categoryLabel: `Redes · ${tipo}${statusHue}`,
  };
}

export type AggregateNotificationsInput = {
  userCreatedAtMs: number;
  /** Utilizador que vê o painel — oculta itens em que `createdByUid` é o próprio. */
  viewerUid: string | undefined;
  agenda: AgendaEvent[];
  posts: SocialPost[];
};

export function aggregateNotifications({
  userCreatedAtMs,
  viewerUid,
  agenda,
  posts,
}: AggregateNotificationsInput): NotificationItem[] {
  const out: NotificationItem[] = [];

  for (const e of agenda) {
    const cms = e.createdAtMs;
    if (typeof cms !== "number" || cms < userCreatedAtMs) continue;

    if (
      viewerUid &&
      e.createdByUid != null &&
      e.createdByUid === viewerUid
    ) {
      continue;
    }

    const dateBr = formatNotificationDateBr(e.date);
    const subtitle = [dateBr, e.time].filter(Boolean).join(" · ");
    out.push({
      id: `agenda:${e.id}`,
      kind: "agenda",
      title: e.title,
      subtitle,
      statusLabel: agendaStatusLabel(e.status),
      actorFirstName: firstTokenFromPersonLabel(e.responsible),
      sortKey: cms,
      accent: accentForAgenda(e.type),
      href: agendaEventUrl(e.id, { date: e.date }),
    });
  }

  for (const p of posts) {
    const cms = p.createdAtMs;
    if (typeof cms !== "number" || cms < userCreatedAtMs) continue;

    if (
      viewerUid &&
      p.createdByUid != null &&
      p.createdByUid === viewerUid
    ) {
      continue;
    }

    const dateBr =
      p.date && p.date !== "—" && /^\d{4}-\d{2}-\d{2}$/.test(p.date)
        ? formatNotificationDateBr(p.date)
        : p.date && p.date !== "—"
          ? p.date
          : undefined;
    out.push({
      id: `social:${p.id}`,
      kind: "social",
      title: p.tema,
      subtitle: dateBr ? `${p.tipo} · ${dateBr}` : p.tipo,
      statusLabel: socialStatusLabel(p.status),
      actorFirstName: firstTokenFromPersonLabel(p.responsavel),
      sortKey: cms,
      accent: accentForSocial(p.tipo, p.status),
      href: "/redes-sociais",
    });
  }

  return out.sort((a, b) => b.sortKey - a.sortKey);
}
