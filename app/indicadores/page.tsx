"use client";

import { AppShell } from "@/components/layout/app-shell";
import { IndicadoresPageSkeleton } from "@/components/page-skeletons";
import { useAgendaEvents } from "@/contexts/agenda-events-context";
import { useSocialFollowers } from "@/contexts/social-followers-context";
import { useSocialPosts } from "@/contexts/social-posts-context";
import { motion } from "framer-motion";
import {
  Activity,
  RefreshCcw,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateBr } from "@/lib/utils";
import {
  SUBREGIONAIS,
  subregionalMeta,
} from "@/lib/constants/subregionais";
import type { AgendaEvent } from "@/data/agenda-events";
import {
  averagePanfletosLast20Weekdays,
  engajamentoMesTotal,
  engajamentoPorRedeNoMes,
  engajamentoSeriePorRedeUltimosMeses,
  formatEngagementPt,
  isIndicadoresAgendaEvent,
  isValidIsoDate,
  lastFourMonthsSlicesEndingAt,
  locaisAtendidosCampoMonthCount,
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
  LineChart,
  Line,
} from "recharts";
import { collectIndicatorMonthsWithData } from "@/lib/indicators/indicator-months";
import { followerEvolutionChartSeries } from "@/lib/indicators/follower-evolution";
import { SocialRedeFaIcon } from "@/components/redes-sociais/social-rede-fa-icon";
import { useEffect, useMemo, useState } from "react";

function agendaCompletedForIndicators(
  events: AgendaEvent[],
  ym: string,
): AgendaEvent[] {
  return events.filter(
    (e) =>
      isIndicadoresAgendaEvent(e) &&
      e.date.startsWith(ym) &&
      e.status === "concluido",
  );
}

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function previousYearMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return ym;
  const d = new Date(y!, m! - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function IndicadoresPage() {
  const { events, hydrated } = useAgendaEvents();
  const { posts: socialPosts, hydrated: socialHydrated } = useSocialPosts();
  const {
    history: followerHistory,
    counts: followerCounts,
    historyHydrated,
  } = useSocialFollowers();
  const dataReady = hydrated && socialHydrated && historyHydrated;

  const monthOptions = useMemo(
    () => collectIndicatorMonthsWithData(events, socialPosts, followerHistory),
    [events, socialPosts, followerHistory],
  );
  const [selectedYm, setSelectedYm] = useState("");

  useEffect(() => {
    if (monthOptions.length === 0) {
      setSelectedYm("");
      return;
    }
    setSelectedYm((cur) =>
      monthOptions.some((o) => o.value === cur) ? cur : monthOptions[0]!.value,
    );
  }, [monthOptions]);

  const ymPrev = selectedYm ? previousYearMonth(selectedYm) : "";

  const followerChartMonthsAsc = useMemo(() => {
    const fromHistory = [...new Set(followerHistory.map((h) => h.yearMonth))].filter(
      (ym) => /^\d{4}-\d{2}$/.test(ym),
    );
    const fromIndicators = monthOptions.map((o) => o.value);
    return [...new Set([...fromHistory, ...fromIndicators])].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [followerHistory, monthOptions]);

  const followerEvolutionData = useMemo(
    () =>
      followerEvolutionChartSeries(followerHistory, {
        monthsAsc:
          followerChartMonthsAsc.length > 0 ? followerChartMonthsAsc : undefined,
        fallbackCounts: followerCounts,
        fallbackYm: currentYearMonth(),
      }),
    [followerHistory, followerChartMonthsAsc, followerCounts],
  );

  const noFollowerChartData =
    followerHistory.length === 0 &&
    followerCounts.facebook === 0 &&
    followerCounts.instagram === 0 &&
    followerCounts.linkedin === 0;

  const communicationKpis = useMemo(() => {
    const avg = averagePanfletosLast20Weekdays(events);
    const loc = locaisAtendidosCampoMonthCount(events, selectedYm);
    const pub = postsPublicadosNoMes(socialPosts, selectedYm).length;
    const eng = engajamentoMesTotal(socialPosts, selectedYm);
    const readyAg = hydrated;
    const readySo = socialHydrated;
    return [
      {
        label: "Média de panfletos / dia",
        value: readyAg ? avg.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : "…",
        hint: "últimos 20 dias úteis (concluídas no terreno; exceto interno)",
        icon: BarChart2,
      },
      {
        label: "Locais atendidos (mês)",
        value: readyAg ? String(loc) : "…",
        hint: "panfletagens, eventos e ações ambientais concluídas (exceto interno)",
        icon: MapPin,
      },
      {
        label: "Posts publicados (mês)",
        value: readySo ? String(pub) : "…",
        hint: "Feed + Reels + Stories",
        icon: Share2,
      },
      {
        label: "Engajamento (mês)",
        value: readySo ? formatEngagementPt(eng) : "…",
        hint: "visualizações + curtidas + partilhas (posts publicados)",
        icon: Heart,
      },
    ];
  }, [events, socialPosts, hydrated, socialHydrated, selectedYm]);

  const socialRows = useMemo(() => {
    const inMonth = socialPosts.filter(
      (p) => isValidIsoDate(p.date) && p.date.startsWith(selectedYm),
    );
    return socialRowsForIndicatorTable(inMonth);
  }, [socialPosts, selectedYm]);

  const panfletagemRows = useMemo(
    () => panfletagemFieldRowsFromEvents(events, selectedYm),
    [events, selectedYm],
  );

  const engagementByRede = useMemo(
    () => engajamentoPorRedeNoMes(socialPosts, selectedYm),
    [socialPosts, selectedYm],
  );

  const engagementSeries = useMemo(() => {
    const slices = lastFourMonthsSlicesEndingAt(selectedYm);
    return engajamentoSeriePorRedeUltimosMeses(socialPosts, slices);
  }, [socialPosts, selectedYm]);

  const monthlyData = useMemo(() => {
    const slices = lastFourMonthsSlicesEndingAt(selectedYm);
    return slices.map(({ ym, label }) => {
      const done = agendaCompletedForIndicators(events, ym);
      const revitalizacoes = done.filter((e) => e.type === "revitalizacao").length;
      const acoes = done.length - revitalizacoes;
      return { month: label, acoes, revitalizacoes };
    });
  }, [events, selectedYm]);

  const regionData = useMemo(() => {
    const done = agendaCompletedForIndicators(events, selectedYm);
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
  }, [events, selectedYm]);

  const stats = useMemo(() => {
    const cur = agendaCompletedForIndicators(events, selectedYm);
    const prev = agendaCompletedForIndicators(events, ymPrev);
    const acoesCur = cur.filter((e) => e.type !== "revitalizacao").length;
    const acoesPrev = prev.filter((e) => e.type !== "revitalizacao").length;
    const revCur = cur.filter((e) => e.type === "revitalizacao").length;
    const revPrev = prev.filter((e) => e.type === "revitalizacao").length;
    const locCur = locaisAtendidosCampoMonthCount(events, selectedYm);
    const locPrev = locaisAtendidosCampoMonthCount(events, ymPrev);

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
        label: "Locais atendidos (mês)",
        value: hydrated ? String(locCur) : "…",
        change: hydrated ? pctDelta(locCur, locPrev) : "…",
        trend: locCur >= locPrev ? ("up" as const) : ("down" as const),
        icon: MapPin,
        description: "panfletagem, eventos e ações ambientais",
      },
    ];
  }, [events, hydrated, selectedYm, ymPrev]);

  return (
    <AppShell title="Indicadores" subtitle="Visão rápida de performance">
      {!dataReady ? (
        <IndicadoresPageSkeleton />
      ) : (
      <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="whitespace-nowrap text-sm font-medium text-zinc-700">
            Mês
          </span>
          <Select
            value={selectedYm || undefined}
            onValueChange={setSelectedYm}
            disabled={monthOptions.length === 0}
          >
            <SelectTrigger className="h-10 w-full min-w-[200px] max-w-xs rounded-xl border-zinc-200 bg-white">
              <SelectValue
                placeholder={
                  monthOptions.length === 0
                    ? "Sem meses com dados"
                    : "Mês"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button
            type="button"
            disabled
            className="h-10 rounded-xl border-0 bg-[#1877f2] px-4 text-white opacity-55 shadow-sm"
          >
            Relatório de redes sociais
          </Button>
          <Button
            type="button"
            disabled
            className="h-10 rounded-xl border-0 bg-emerald-600 px-4 text-white opacity-55 shadow-sm"
          >
            Relatório de educação ambiental
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="rounded-2xl bg-white p-5 shadow-lg shadow-zinc-200/50"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--gradient-start)]/10 to-[var(--gradient-end)]/10">
                <stat.icon className="h-5 w-5 text-[var(--gradient-accent)]" />
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
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--gradient-start)]/10 to-[var(--gradient-end)]/10">
                  <k.icon className="h-5 w-5 text-[var(--gradient-accent)]" />
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
              Data · Tipo · Tema · Status · Responsável · Rede · Link / arquivo
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tema</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Rede</TableHead>
                  <TableHead className="text-right">Link / arquivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {socialRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-zinc-500">
                      Sem conteúdos de redes no Banco de Dados.
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
                    <TableCell className="text-sm text-zinc-600">
                      {row.redeKey ? (
                        <span className="flex items-center gap-2">
                          <SocialRedeFaIcon
                            rede={row.redeKey}
                            className="w-4 shrink-0 text-center text-base leading-none text-zinc-800"
                          />
                          <span>{row.rede}</span>
                        </span>
                      ) : (
                        row.rede
                      )}
                    </TableCell>
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
            transition={{ delay: 0.06 }}
            className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50"
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Engajamento por rede</h3>
                <p className="text-sm text-zinc-500">
                  Evolução nos últimos 4 meses até o mês selecionado (soma de visualizações,
                  curtidas e partilhas por post publicado). Rede por campo ou inferida pelo link.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-zinc-600">
                <span className="inline-flex items-center gap-1.5">
                  <SocialRedeFaIcon
                    rede="facebook"
                    className="text-center text-base leading-none text-[#1877f2]"
                  />
                  {formatEngagementPt(engagementByRede.facebook)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <SocialRedeFaIcon
                    rede="instagram"
                    className="text-center text-base leading-none text-[#E4405F]"
                  />
                  {formatEngagementPt(engagementByRede.instagram)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <SocialRedeFaIcon
                    rede="linkedin"
                    className="text-center text-base leading-none text-[#0A66C2]"
                  />
                  {formatEngagementPt(engagementByRede.linkedin)}
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={engagementSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#71717a", fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#71717a", fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number) => formatEngagementPt(value)}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="facebook"
                  name="Facebook"
                  stroke="#1877f2"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="instagram"
                  name="Instagram"
                  stroke="#E4405F"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="linkedin"
                  name="LinkedIn"
                  stroke="#0A66C2"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="#52525b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50"
          >
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">
                  Evolução de seguidores por rede
                </h3>
                <p className="text-sm text-zinc-500">
                  Último registo guardado em cada mês por rede; entre atualizações mantém-se o
                  valor anterior (evolução contínua).
                </p>
              </div>
            </div>
            {noFollowerChartData ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                Ainda não há histórico de seguidores. Os valores passam a ser registados quando
                atualizar contagens na página Redes sociais.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={followerEvolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis
                    dataKey="monthShort"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#71717a", fontSize: 12 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#71717a", fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) =>
                      value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
                    }
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="facebook"
                    name="Facebook"
                    stroke="#1877F2"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="instagram"
                    name="Instagram"
                    stroke="#E4405F"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="linkedin"
                    name="LinkedIn"
                    stroke="#0A66C2"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
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
                      Nenhuma panfletagem concluída no mês selecionado na agenda.
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
              <p className="text-sm text-zinc-500">
                Concluídas nos últimos 4 meses até o mês selecionado (exceto registos internos —
                garagem / reuniões)
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-accent-gradient" />
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
            Ações concluídas no mês selecionado, exceto subregional Interno (garagem / reuniões).
            Subregional nas visitas; nas revitalizações, a partir da subprefeitura do ponto
            viciado.
          </p>
          {regionData.length === 0 ? (
            <div className="mt-10 flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-zinc-500">
              <p>Nenhuma ação concluída no mês selecionado ou sem subregional informado nos registos.</p>
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
      </div>
      </>
      )}
    </AppShell>
  );
}
