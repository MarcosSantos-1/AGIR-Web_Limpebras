import type { AgendaEvent } from "@/data/agenda-events";
import type {
  SocialPost,
  SocialPublicationRede,
} from "@/data/social-posts";

export function isValidIsoDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

/**
 * Eventos da agenda que entram nos Indicadores.
 * Exclui subregional "Interno (garagem / reuniões)".
 */
export function isIndicadoresAgendaEvent(e: AgendaEvent): boolean {
  return e.subregional !== "interno";
}

/** Evento concluído com panfletagem explícita ou unidades registadas. */
export function isPanfletagemRelevant(e: AgendaEvent): boolean {
  if (e.status !== "concluido") return false;
  if (e.type === "panfletagem") return true;
  const p = e.panfletosDistribuidos;
  return typeof p === "number" && p > 0;
}

function isLocaisAtendidosCampoTipo(e: AgendaEvent): boolean {
  return (
    e.type === "panfletagem" || e.type === "evento" || e.type === "acao-ambiental"
  );
}

/** Concluídos no mês: panfletagem, eventos e ações ambientais (exclui interno). */
export function locaisAtendidosCampoMonthCount(
  events: AgendaEvent[],
  ym: string,
): number {
  return events.filter(
    (e) =>
      isIndicadoresAgendaEvent(e) &&
      e.status === "concluido" &&
      e.date.startsWith(ym) &&
      isLocaisAtendidosCampoTipo(e),
  ).length;
}

function toIsoDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

/** Os últimos N dias úteis (seg–sex), incluindo o ponto de ancoragem se for útil. */
export function lastNWeekdayIsoStrings(n: number, anchor: Date = new Date()): string[] {
  const out: string[] = [];
  const cur = new Date(anchor);
  cur.setHours(12, 0, 0, 0);
  while (out.length < n) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) {
      out.push(toIsoDate(cur));
    }
    cur.setDate(cur.getDate() - 1);
  }
  return out;
}

export function averagePanfletosLast20Weekdays(events: AgendaEvent[]): number {
  const days = lastNWeekdayIsoStrings(20);
  let sum = 0;
  for (const iso of days) {
    for (const e of events) {
      if (!isIndicadoresAgendaEvent(e)) continue;
      if (e.status !== "concluido" || e.date !== iso) continue;
      if (!isPanfletagemRelevant(e)) continue;
      const p = e.panfletosDistribuidos;
      if (typeof p === "number" && Number.isFinite(p)) sum += p;
    }
  }
  return Math.round((sum / 20) * 10) / 10;
}

/** @deprecated Prefer locaisAtendidosCampoMonthCount para o KPI alinhado ao campo. */
export function locaisAtendidosMonthCount(
  events: AgendaEvent[],
  ym: string,
): number {
  return locaisAtendidosCampoMonthCount(events, ym);
}

export function postsPublicadosNoMes(
  posts: SocialPost[],
  ym: string,
): SocialPost[] {
  return posts.filter(
    (p) =>
      p.status === "publicado" &&
      isValidIsoDate(p.date) &&
      p.date.startsWith(ym),
  );
}

const MONTH_SHORT_CHART = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

/** Últimos 4 meses terminando no mês `ym` (AAAA-MM). */
export function lastFourMonthsSlicesEndingAt(ym: string): {
  ym: string;
  label: string;
}[] {
  const parts = ym.split("-").map(Number);
  const y = parts[0]!;
  const mo = parts[1]!;
  const end = new Date(y, mo - 1, 1);
  const out: { ym: string; label: string }[] = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const yms = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ ym: yms, label: MONTH_SHORT_CHART[d.getMonth()]! });
  }
  return out;
}

function inferRedeFromLinkPost(url: string | undefined): SocialPublicationRede | null {
  if (!url?.trim()) return null;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    if (host.includes("facebook") || host.includes("fb.com")) return "facebook";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("linkedin")) return "linkedin";
  } catch {
    const low = url.toLowerCase();
    if (low.includes("facebook") || low.includes("fb.com")) return "facebook";
    if (low.includes("instagram")) return "instagram";
    if (low.includes("linkedin")) return "linkedin";
  }
  return null;
}

export function resolvePublicationRedeForPost(
  p: SocialPost,
): SocialPublicationRede | null {
  if (p.status !== "publicado") return null;
  if (p.redePublicacao) return p.redePublicacao;
  return inferRedeFromLinkPost(p.linkPost);
}

export function postEngagementScore(p: SocialPost): number {
  return (p.visualizacoes ?? 0) + (p.curtidas ?? 0) + (p.compartilhamentos ?? 0);
}

export function engajamentoMesTotal(posts: SocialPost[], ym: string): number {
  let t = 0;
  for (const p of postsPublicadosNoMes(posts, ym)) {
    t += postEngagementScore(p);
  }
  return t;
}

export type EngajamentoPorRede = Record<SocialPublicationRede, number>;

export function engajamentoPorRedeNoMes(
  posts: SocialPost[],
  ym: string,
): EngajamentoPorRede {
  const out: EngajamentoPorRede = {
    facebook: 0,
    instagram: 0,
    linkedin: 0,
  };
  for (const p of postsPublicadosNoMes(posts, ym)) {
    const r = resolvePublicationRedeForPost(p);
    if (!r) continue;
    out[r] += postEngagementScore(p);
  }
  return out;
}

export type EngajamentoSerieMes = {
  month: string;
  ym: string;
  facebook: number;
  instagram: number;
  linkedin: number;
  total: number;
};

export function engajamentoSeriePorRedeUltimosMeses(
  posts: SocialPost[],
  slices: { ym: string; label: string }[],
): EngajamentoSerieMes[] {
  return slices.map(({ ym, label }) => {
    const byRede = engajamentoPorRedeNoMes(posts, ym);
    const total = engajamentoMesTotal(posts, ym);
    return {
      month: label,
      ym,
      facebook: byRede.facebook,
      instagram: byRede.instagram,
      linkedin: byRede.linkedin,
      total,
    };
  });
}

export function formatEngagementPt(n: number): string {
  if (n <= 0) return "0";
  return n.toLocaleString("pt-BR");
}

export function formatRedeLabel(
  p: SocialPost,
): string {
  if (p.status !== "publicado") return "—";
  const r = resolvePublicationRedeForPost(p);
  if (!r) return "—";
  const labels: Record<SocialPublicationRede, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    linkedin: "LinkedIn",
  };
  return labels[r];
}

export function socialRowsForIndicatorTable(posts: SocialPost[]): {
  id: string;
  date: string;
  tipo: string;
  tema: string;
  status: string;
  responsavel: string;
  rede: string;
  redeKey: SocialPublicationRede | null;
  link: string;
}[] {
  const copy = [...posts].sort((a, b) => Number(b.id) - Number(a.id));
  return copy.map((p) => ({
    id: String(p.id),
    date: p.date,
    tipo: p.tipo,
    tema: p.tema,
    status: p.status,
    responsavel: p.responsavel,
    rede: formatRedeLabel(p),
    redeKey: resolvePublicationRedeForPost(p),
    link:
      p.linkPost?.trim() ||
      p.linkOuArquivo?.trim() ||
      p.linkOuArquivoLabel?.trim() ||
      "—",
  }));
}

export function parseLocaisCount(raw: string | undefined): number {
  if (!raw?.trim()) return 0;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) return parts.length;
  const m = raw.match(/\d+/);
  return m ? Number.parseInt(m[0]!, 10) : 0;
}

export function panfletagemFieldRowsFromEvents(
  events: AgendaEvent[],
  ym: string,
): {
  key: string;
  date: string;
  equipe: string;
  panfletos: number;
  locais: number | string;
  fotos: number;
  obs: string;
}[] {
  return events
    .filter(
      (e) =>
        isIndicadoresAgendaEvent(e) &&
        e.status === "concluido" &&
        e.date.startsWith(ym) &&
        isPanfletagemRelevant(e),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .map((e) => {
      const locaisN = parseLocaisCount(e.locaisAtendidos);
      const pan = e.panfletosDistribuidos ?? 0;
      const fot = e.fotosTiradas ?? 0;
      const equipe =
        e.equipe?.trim() ||
        (e.equipeIntegrantes?.length
          ? e.equipeIntegrantes.join(", ")
          : "—");
      const obs =
        e.completionDescription?.trim() ||
        e.observations?.trim() ||
        "—";
      return {
        key: String(e.id),
        date: e.date,
        equipe,
        panfletos: pan,
        locais: locaisN > 0 ? locaisN : "—",
        fotos: fot,
        obs,
      };
    });
}
