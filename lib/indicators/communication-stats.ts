import type { AgendaEvent } from "@/data/agenda-events";
import type { SocialPost } from "@/data/social-posts";

export function isValidIsoDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

/** Evento concluído com panfletagem explícita ou unidades registadas. */
export function isPanfletagemRelevant(e: AgendaEvent): boolean {
  if (e.status !== "concluido") return false;
  if (e.type === "panfletagem") return true;
  const p = e.panfletosDistribuidos;
  return typeof p === "number" && p > 0;
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
      if (e.status !== "concluido" || e.date !== iso) continue;
      if (!isPanfletagemRelevant(e)) continue;
      const p = e.panfletosDistribuidos;
      if (typeof p === "number" && Number.isFinite(p)) sum += p;
    }
  }
  return Math.round((sum / 20) * 10) / 10;
}

export function locaisAtendidosMonthCount(
  events: AgendaEvent[],
  ym: string,
): number {
  return events.filter(
    (e) =>
      e.status === "concluido" &&
      e.date.startsWith(ym) &&
      isPanfletagemRelevant(e),
  ).length;
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

export function engajamentoMesTotal(posts: SocialPost[], ym: string): number {
  let t = 0;
  for (const p of postsPublicadosNoMes(posts, ym)) {
    t += p.curtidas ?? 0;
    t += p.compartilhamentos ?? 0;
    t += p.visualizacoes ?? 0;
  }
  return t;
}

export function formatEngagementPt(n: number): string {
  if (n <= 0) return "0";
  return n.toLocaleString("pt-BR");
}

export function socialRowsForIndicatorTable(posts: SocialPost[]): {
  id: string;
  date: string;
  tipo: string;
  tema: string;
  status: string;
  responsavel: string;
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
