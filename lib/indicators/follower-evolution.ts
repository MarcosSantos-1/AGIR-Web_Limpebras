import type {
  FollowerHistoryRow,
  SocialFollowerCounts,
} from "@/data/social-followers";

const MONTH_SHORT = [
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

function monthShortLabel(ym: string): string {
  const mo = Number(ym.split("-")[1]);
  if (mo >= 1 && mo <= 12) return MONTH_SHORT[mo - 1]!;
  return ym;
}

export type FollowerEvolutionPoint = {
  ym: string;
  monthShort: string;
  facebook: number;
  instagram: number;
  linkedin: number;
};

/**
 * Série mensal com carry-forward por rede (último registo no mês para cada rede;
 * mantém o valor anterior se não houve atualização nesse mês).
 */
export function followerEvolutionChartSeries(
  historyRows: FollowerHistoryRow[],
  options?: {
    /** Se definido, restringe e ordena os meses (AAAA-MM asc). */
    monthsAsc?: string[];
    fallbackCounts?: SocialFollowerCounts;
    fallbackYm?: string;
  },
): FollowerEvolutionPoint[] {
  const fromHistory = [...new Set(historyRows.map((r) => r.yearMonth))].filter(
    (ym) => /^\d{4}-\d{2}$/.test(ym),
  );
  let months =
    options?.monthsAsc && options.monthsAsc.length > 0
      ? [...new Set(options.monthsAsc)].sort((a, b) => a.localeCompare(b))
      : [...fromHistory].sort((a, b) => a.localeCompare(b));

  if (months.length === 0 && options?.fallbackCounts && options?.fallbackYm) {
    const c = options.fallbackCounts;
    return [
      {
        ym: options.fallbackYm,
        monthShort: monthShortLabel(options.fallbackYm),
        facebook: c.facebook,
        instagram: c.instagram,
        linkedin: c.linkedin,
      },
    ];
  }
  if (months.length === 0) return [];

  let cfF = 0;
  let cfI = 0;
  let cfL = 0;
  if (historyRows.length === 0 && options?.fallbackCounts) {
    const c = options.fallbackCounts;
    cfF = c.facebook;
    cfI = c.instagram;
    cfL = c.linkedin;
  }
  const out: FollowerEvolutionPoint[] = [];

  for (const ym of months) {
    const rows = historyRows
      .filter((h) => h.yearMonth === ym)
      .sort((a, b) => a.recordedAtMs - b.recordedAtMs);
    let f = cfF;
    let i = cfI;
    let l = cfL;
    for (const r of rows) {
      if (r.rede === "facebook") f = r.followers;
      else if (r.rede === "instagram") i = r.followers;
      else l = r.followers;
    }
    cfF = f;
    cfI = i;
    cfL = l;
    out.push({
      ym,
      monthShort: monthShortLabel(ym),
      facebook: cfF,
      instagram: cfI,
      linkedin: cfL,
    });
  }

  return out;
}
