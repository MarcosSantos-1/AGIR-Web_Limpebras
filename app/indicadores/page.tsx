"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useAgendaEvents } from "@/contexts/agenda-events-context";
import { useSocialPosts } from "@/contexts/social-posts-context";
import { motion } from "framer-motion";
import {
  Activity,
  RefreshCcw,
  AlertTriangle,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Share2,
  BarChart2,
  Heart,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateBr } from "@/lib/utils";
import {
  SUBREGIONAIS,
  subregionalMeta,
} from "@/lib/constants/subregionais";
import type { AgendaEvent } from "@/data/agenda-events";
import {
  averagePanfletosLast20Weekdays,
  engajamentoMesTotal,
  formatEngagementPt,
  locaisAtendidosMonthCount,
  panfletagemFieldRowsFromEvents,
  postsPublicadosNoMes,
  socialRowsForIndicatorTable,
} from "@/lib/indicators/communication-stats";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import { useMemo } from "react";

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

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function previousYearMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y!, m! - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Últimos 4 meses (inclui o mês corrente), rótulo curto no gráfico. */
function lastFourMonthsSlices(): { ym: string; label: string }[] {
  const out: { ym: string; label: string }[] = [];
  const now = new Date();
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ ym, label: MONTH_SHORT[d.getMonth()]! });
  }
  return out;
}

function completedInMonth(events: AgendaEvent[], ym: string): AgendaEvent[] {
  return events.filter(
    (e) => e.date.startsWith(ym) && e.status === "concluido",
  );
}

const reincidenceData = [
  { month: "Jan", reincidencias: 5 },
  { month: "Fev", reincidencias: 8 },
  { month: "Mar", reincidencias: 4 },
  { month: "Abr", reincidencias: 3 },
];

const criticalRegions = [
  { name: "R. Silva Jardim - Centro", occurrences: 5, status: "crítico" },
  { name: "Av. Marginal km 5 - Zona Sul", occurrences: 8, status: "crítico" },
];

function ComingSoonOverlay({ label = "Em breve" }: { label?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center rounded-3xl bg-white/55 px-4 backdrop-blur-[2px]">
      <span className="rounded-full bg-zinc-900/85 px-4 py-2 text-center text-sm font-medium text-white shadow-lg">
        {label}
      </span>
      <p className="mt-2 max-w-sm text-center text-xs text-zinc-600">
        Pré-visualização com dados de exemplo; integração em breve.
      </p>
    </div>
  );
}

export default function IndicadoresPage() {
  const { events, hydrated } = useAgendaEvents();
  const { posts: socialPosts, hydrated: socialHydrated } = useSocialPosts();

  const ymNow = currentYearMonth();
  const ymPrev = previousYearMonth(ymNow);

  const communicationKpis = useMemo(() => {
    const avg = averagePanfletosLast20Weekdays(events);
    const loc = locaisAtendidosMonthCount(events, ymNow);
    const pub = postsPublicadosNoMes(socialPosts, ymNow).length;
    const eng = engajamentoMesTotal(socialPosts, ymNow);
    const readyAg = hydrated;
    const readySo = socialHydrated;
    return [
      {
        label: "Média de panfletos / dia",
        value: readyAg ? avg.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : "…",
        hint: "últimos 20 dias úteis (agenda concluída)",
        icon: BarChart2,
      },
      {
        label: "Locais atendidos (mês)",
        value: readyAg ? String(loc) : "…",
        hint: "registos com panfletagem no mês corrente",
        icon: MapPin,
      },
      {
        label: "Posts publicados (mês)",
        value: readySo ? String(pub) : "…",
        hint: "Feed + Reels + Stories (Firestore)",
        icon: Share2,
      },
      {
        label: "Engajamento (mês)",
        value: readySo ? formatEngagementPt(eng) : "…",
        hint: "visualizações + curtidas + partilhas (posts publicados)",
        icon: Heart,
      },
    ];
  }, [events, socialPosts, hydrated, socialHydrated, ymNow]);

  const socialRows = useMemo(
    () => socialRowsForIndicatorTable(socialPosts),
    [socialPosts],
  );

  const panfletagemRows = useMemo(
    () => panfletagemFieldRowsFromEvents(events, ymNow),
    [events, ymNow],
  );

  const monthlyData = useMemo(() => {
    const slices = lastFourMonthsSlices();
    return slices.map(({ ym, label }) => {
      const done = completedInMonth(events, ym);
      const revitalizacoes = done.filter((e) => e.type === "revitalizacao").length;
      const acoes = done.length - revitalizacoes;
      return { month: label, acoes, revitalizacoes };
    });
  }, [events]);

  const regionData = useMemo(() => {
    const done = completedInMonth(events, ymNow);
    const total = done.length;
    const counts = new Map<string, number>();
    for (const e of done) {
      const key = e.subregional ?? "__none__";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const rows: { name: string; value: number; color: string }[] = [];
    for (const s of SUBREGIONAIS) {
      const c = counts.get(s.id) ?? 0;
      const { label, color } = subregionalMeta(s.id);
      rows.push({
        name: label,
        value: c,
        color,
      });
    }
    const none = counts.get("__none__") ?? 0;
    if (none > 0) {
      rows.push({
        name: "Não informado",
        value: none,
        color: "#a3a3a3",
      });
    }
    if (total === 0) return [];
    return rows.filter((r) => r.value > 0).map((r) => ({
      ...r,
      pct: Math.round((r.value / total) * 1000) / 10,
    }));
  }, [events, ymNow]);

  const stats = useMemo(() => {
    const cur = completedInMonth(events, ymNow);
    const prev = completedInMonth(events, ymPrev);
    const acoesCur = cur.filter((e) => e.type !== "revitalizacao").length;
    const acoesPrev = prev.filter((e) => e.type !== "revitalizacao").length;
    const revCur = cur.filter((e) => e.type === "revitalizacao").length;
    const revPrev = prev.filter((e) => e.type === "revitalizacao").length;

    const pctDelta = (a: number, b: number) => {
      if (b <= 0) return a > 0 ? "+100%" : "—";
      const p = Math.round(((a - b) / b) * 100);
      return `${p >= 0 ? "+" : ""}${p}%`;
    };

    return [
      {
        label: "Ações do Mês",
        value: hydrated ? String(acoesCur) : "…",
        change: hydrated ? pctDelta(acoesCur, acoesPrev) : "…",
        trend: acoesCur >= acoesPrev ? ("up" as const) : ("down" as const),
        icon: Activity,
        description: "concluídas (exceto revitalização)",
      },
      {
        label: "Revitalizações",
        value: hydrated ? String(revCur) : "…",
        change: hydrated ? (revCur >= revPrev ? `+${revCur - revPrev}` : `${revCur - revPrev}`) : "…",
        trend: revCur >= revPrev ? ("up" as const) : ("down" as const),
        icon: RefreshCcw,
        description: "concluídas no mês",
      },
      {
        label: "Reincidências",
        value: "3",
        change: "-25%",
        trend: "down" as const,
        icon: AlertTriangle,
        description: "indicador piloto",
      },
      {
        label: "Regiões Críticas",
        value: "2",
        change: "-1",
        trend: "down" as const,
        icon: MapPin,
        description: "em monitoramento",
      },
    ];
  }, [events, hydrated, ymNow, ymPrev]);

  return (
    <AppShell title="Indicadores" subtitle="Visão rápida de performance">
      {/* Main Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="rounded-2xl bg-white p-5 shadow-lg shadow-zinc-200/50"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#f318e3]/10 to-[#6a0eaf]/10">
                <stat.icon className="h-5 w-5 text-[#9b0ba6]" />
              </div>
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  stat.trend === "up" ? "text-emerald-600" : "text-emerald-600"
                }`}
              >
                {stat.trend === "up" ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {stat.change}
              </div>
            </div>
            <p className="mt-4 text-3xl font-semibold text-zinc-900">{stat.value}</p>
            <p className="mt-1 text-sm text-zinc-500">{stat.label}</p>
            <p className="text-xs text-zinc-400">{stat.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Comunicação, redes e panfletagem (mock — substitui planilha manual) */}
      <div className="mb-8 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Comunicação, redes sociais e panfletagem
          </h2>
          <p className="text-sm text-zinc-500">
            Resumo e quadros alimentados pelo Firestore (agenda + redes sociais). Valores podem ser zero.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {communicationKpis.map((k, index) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className="rounded-2xl bg-white p-5 shadow-lg shadow-zinc-200/50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500">{k.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">{k.value}</p>
                  <p className="mt-1 text-xs text-zinc-400">{k.hint}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#f318e3]/10 to-[#6a0eaf]/10">
                  <k.icon className="h-5 w-5 text-[#9b0ba6]" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50"
          >
            <h3 className="text-lg font-semibold text-zinc-900">Cronograma de redes sociais</h3>
            <p className="mb-4 text-sm text-zinc-500">
              Data · Tipo · Tema · Status · Responsável · Link / arquivo
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tema</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Link / arquivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {socialRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-zinc-500">
                      Sem conteúdos de redes no Firestore.
                    </TableCell>
                  </TableRow>
                ) : (
                  socialRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-zinc-600">
                      {row.date === "—" ? "—" : formatDateBr(row.date)}
                    </TableCell>
                    <TableCell>{row.tipo}</TableCell>
                    <TableCell className="max-w-[200px]">{row.tema}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          row.status === "publicado"
                            ? "bg-emerald-100 text-emerald-800"
                            : row.status === "rascunho"
                              ? "bg-zinc-200 text-zinc-800"
                              : row.status === "ideia"
                                ? "bg-violet-100 text-violet-800"
                                : "bg-amber-100 text-amber-800"
                        }
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-700">{row.responsavel}</TableCell>
                    <TableCell className="text-right text-xs text-zinc-500">{row.link}</TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50"
          >
            <h3 className="text-lg font-semibold text-zinc-900">Panfletagem em campo</h3>
            <p className="mb-4 text-sm text-zinc-500">
              Data · Equipe · Panfletos distribuídos · Locais atendidos · Fotos tiradas · Observações
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead className="text-right">Panfletos</TableHead>
                  <TableHead className="text-right">Locais</TableHead>
                  <TableHead className="text-right">Fotos</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {panfletagemRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-zinc-500">
                      Nenhuma panfletagem concluída neste mês na agenda.
                    </TableCell>
                  </TableRow>
                ) : (
                  panfletagemRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="whitespace-nowrap text-zinc-600">{formatDateBr(row.date)}</TableCell>
                    <TableCell>{row.equipe}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {row.panfletos.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.locais}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.fotos}</TableCell>
                    <TableCell className="text-zinc-600">{row.obs}</TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </motion.div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Monthly Actions Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="col-span-12 rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50 lg:col-span-8"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">Ações por Mês</h3>
              <p className="text-sm text-zinc-500">Concluídas nos últimos 4 meses (Firestore)</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-gradient-to-r from-[#f318e3] to-[#6a0eaf]" />
                <span className="text-sm text-zinc-500">Ações</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-zinc-500">Revitalizações</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                }}
              />
              <Bar dataKey="acoes" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="revitalizacoes" fill="#10b981" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f318e3" />
                  <stop offset="100%" stopColor="#6a0eaf" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Region Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="col-span-12 rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50 lg:col-span-4"
        >
          <h3 className="text-lg font-semibold text-zinc-900">Distribuição por Subregional</h3>
          <p className="text-sm text-zinc-500">
            Ações concluídas no mês corrente · subregional nas ações; nas revitalizações, a
            partir da subprefeitura do ponto viciado
          </p>
          {regionData.length === 0 ? (
            <div className="mt-10 flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-zinc-500">
              <p>Nenhuma ação concluída neste mês ou sem subregional informado nos registos.</p>
              <p className="text-xs text-zinc-400">
                Preencha Subregional nas ações de visita; nas revitalizações o mapa define a
                subprefeitura.
              </p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={regionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {regionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, _n, item) => {
                      const p = item.payload as { pct?: number };
                      const pct = typeof p.pct === "number" ? `${p.pct}%` : "";
                      return [`${value} ${pct ? `(${pct})` : ""}`, "Registos"];
                    }}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {regionData.map((region) => (
                  <div key={region.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: region.color }}
                      />
                      <span className="text-sm text-zinc-600">{region.name}</span>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-zinc-900">
                      {"pct" in region ? `${region.pct}%` : ""}
                      <span className="ml-2 text-zinc-500">({region.value})</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Reincidence Trend — preview desativada */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative col-span-12 rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50 lg:col-span-6"
        >
          <div className="pointer-events-none opacity-[0.42] saturate-[0.65]">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-zinc-900">Tendência de Reincidências</h3>
              <p className="text-sm text-zinc-500">Evolução mensal de pontos reincidentes</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={reincidenceData}>
                <defs>
                  <linearGradient id="reincidenceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f318e3" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f318e3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="reincidencias"
                  stroke="#f318e3"
                  strokeWidth={2}
                  fill="url(#reincidenceGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <ComingSoonOverlay />
        </motion.div>

        {/* Critical Regions — preview desativada */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="relative col-span-12 rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50 lg:col-span-6"
        >
          <div className="pointer-events-none opacity-[0.42] saturate-[0.65]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Regiões Críticas</h3>
                <p className="text-sm text-zinc-500">Áreas que demandam atenção</p>
              </div>
              <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                {criticalRegions.length} áreas
              </span>
            </div>
            <div className="space-y-3">
              {criticalRegions.map((region, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-xl bg-red-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900">{region.name}</p>
                      <p className="text-sm text-red-600">
                        {region.occurrences} ocorrências
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white">
                    Crítico
                  </span>
                </div>
              ))}
            </div>
          </div>
          <ComingSoonOverlay />
        </motion.div>
      </div>
    </AppShell>
  );
}
