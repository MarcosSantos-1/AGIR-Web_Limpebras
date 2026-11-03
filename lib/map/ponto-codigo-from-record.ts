const TITLE_RE = /^Revitalização\s*[—\-]\s*(.+)$/i;
const OBS_RE = /^Ponto viciado:\s*(.+)$/im;
const CODIGO_RE = /^[A-Z]{2,3}-\d+$/i;

function normalizeCodigo(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  if (!CODIGO_RE.test(code)) return null;
  return code;
}

/** Extrai código territorial (ex. CV-011) de título ou observações de revitalização. */
export function extractPontoViciadoCodigoFromRecord(input: {
  title?: string;
  observations?: string;
  type?: string;
}): string | null {
  const fromTitle = input.title ? TITLE_RE.exec(input.title.trim()) : null;
  if (fromTitle?.[1]) {
    const code = normalizeCodigo(fromTitle[1]);
    if (code) return code;
  }
  const fromObs = input.observations ? OBS_RE.exec(input.observations) : null;
  if (fromObs?.[1]) return normalizeCodigo(fromObs[1]);
  return null;
}
