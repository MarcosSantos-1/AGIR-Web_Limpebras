import type { Diagnostic } from "@/lib/diagnosticos";

/** Apply saved edits by immutable row ID before deduplicating point codes. */
export function mergeSurveyRows(originals: Diagnostic[], updates: Diagnostic[]) {
  const rows = new Map(originals.map((row) => [row.id, row]));
  for (const row of updates) rows.set(row.id, row);
  const points = new Map<string, Diagnostic>();
  for (const row of rows.values()) {
    const previous = points.get(row.pointId);
    if (!previous || (row.updatedAtMs ?? 0) >= (previous.updatedAtMs ?? 0)) points.set(row.pointId, row);
  }
  return [...points.values()];
}
