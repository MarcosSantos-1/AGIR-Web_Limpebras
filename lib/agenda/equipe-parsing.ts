import type { AgendaEvent } from "@/data/agenda-events";

/** `equipe` legado só com contagem, sem nomes. */
const LEGACY_COUNT_ONLY = /^\d+\s*pessoa\(s\)$/i;

/**
 * Nomes da equipe no terreno a partir do evento (array persistido ou `equipe` comma‑separated).
 */
export function integrantesFromAgendaEvent(
  ev: Pick<AgendaEvent, "equipeIntegrantes" | "equipe"> | null | undefined,
): string[] {
  if (!ev) return [];
  const fromArr = ev.equipeIntegrantes?.map((s) => s.trim()).filter(Boolean) ?? [];
  if (fromArr.length) return fromArr;
  const raw = ev.equipe?.trim();
  if (!raw || LEGACY_COUNT_ONLY.test(raw)) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
