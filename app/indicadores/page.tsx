"use client";

import { AppShell } from "@/components/layout/app-shell";
import { motion } from "framer-motion";
import {
  Activity,
  RefreshCcw,
  AlertTriangle,
  MapPin,
  Target,
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
  Area,
  AreaChart,
} from "recharts";

const monthlyData = [
  { month: "Jan", acoes: 28, revitalizacoes: 4 },
  { month: "Fev", acoes: 35, revitalizacoes: 6 },
  { month: "Mar", acoes: 42, revitalizacoes: 8 },
  { month: "Abr", acoes: 38, revitalizacoes: 5 },
];

const weeklyProductivity = [
  { week: "Sem 1", concluidas: 8, pendentes: 2 },
  { week: "Sem 2", concluidas: 12, pendentes: 3 },
  { week: "Sem 3", concluidas: 10, pendentes: 1 },
  { week: "Sem 4", concluidas: 8, pendentes: 4 },
];

const regionData = [
  { name: "Centro", value: 35, color: "#f318e3" },
  { name: "Zona Norte", value: 25, color: "#6a0eaf" },
  { name: "Zona Sul", value: 20, color: "#3b82f6" },
  { name: "Zona Leste", value: 12, color: "#10b981" },
  { name: "Zona Oeste", value: 8, color: "#f59e0b" },
];

const reincidenceData = [
  { month: "Jan", reincidencias: 5 },
  { month: "Fev", reincidencias: 8 },
  { month: "Mar", reincidencias: 4 },
  { month: "Abr", reincidencias: 3 },
];

const stats = [
  {
    label: "Ações do Mês",
    value: "38",
    change: "+12%",
    trend: "up",
    icon: Activity,
    description: "vs mês anterior",
  },
  {
    label: "Revitalizações",
    value: "5",
    change: "+2",
    trend: "up",
    icon: RefreshCcw,
    description: "concluídas",
  },
  {
    label: "Reincidências",
    value: "3",
    change: "-25%",
    trend: "down",
    icon: AlertTriangle,
    description: "redução",
  },
  {
    label: "Regiões Críticas",
    value: "2",
    change: "-1",
    trend: "down",
    icon: MapPin,
    description: "em monitoramento",
  },
  {
    label: "Produtividade",
    value: "92%",
    change: "+5%",
    trend: "up",
    icon: Target,
    description: "meta mensal",
  },
];

const criticalRegions = [
  { name: "R. Silva Jardim - Centro", occurrences: 5, status: "crítico" },
  { name: "Av. Marginal km 5 - Zona Sul", occurrences: 8, status: "crítico" },
];

const teamProductivity = [
  { name: "Igor Supervisor", actions: 18, completion: 94 },
  { name: "Maria", actions: 15, completion: 100 },
  { name: "Luciana", actions: 12, completion: 83 },
];

const communicationKpis = [
  {
    label: "Média de panfletos / dia",
    value: "240",
    hint: "últimos 20 dias úteis",
    icon: BarChart2,
  },
  {
    label: "Locais atendidos (mês)",
    value: "32",
    hint: "panfletagem + ações de rua",
    icon: MapPin,
  },
  {
    label: "Posts publicados (mês)",
    value: "18",
    hint: "Feed + Reels + Stories",
    icon: Share2,
  },
  {
    label: "Engajamento (mês)",
    value: "1,2k",
    hint: "curtidas + comentários",
    icon: Heart,
  },
];

const socialContentRows = [
  {
    date: "2025-04-18",
    tipo: "Reel" as const,
    tema: "Coleta seletiva no bairro",
    status: "publicado" as const,
    responsavel: "Maria",
    link: "instagram.com/p/...",
  },
  {
    date: "2025-04-20",
    tipo: "Post" as const,
    tema: "Dica da semana: compostagem",
    status: "rascunho" as const,
    responsavel: "Luciana",
    link: "—",
  },
  {
    date: "2025-04-22",
    tipo: "Story" as const,
    tema: "Bastidores | Ecoponto",
    status: "agendado" as const,
    responsavel: "Igor Supervisor",
    link: "drive/.../story.png",
  },
];

const panfletagemRows = [
  {
    date: "2025-04-15",
    equipe: "Igor, Maria, Luciana",
    panfletos: 800,
    locais: 4,
    fotos: 12,
    obs: "Praças e terminal",
  },
  {
    date: "2025-04-19",
    equipe: "Maria, Luciana",
    panfletos: 520,
    locais: 3,
    fotos: 8,
    obs: "Zona escolar",
  },
];

export default function IndicadoresPage() {
  return (
    <AppShell title="Indicadores" subtitle="Visão rápida de performance">
      {/* Main Stats */}
      <div className="mb-8 grid grid-cols-5 gap-4">
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
              <div className={`flex items-center gap-1 text-sm font-medium ${
                stat.trend === "up" ? "text-emerald-600" : "text-emerald-600"
              }`}>
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
            Resumo e cadros no formato do cronograma (dados de exemplo até integrar ao sistema).
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
                {socialContentRows.map((row) => (
                  <TableRow key={`${row.date}-${row.tema}`}>
                    <TableCell className="whitespace-nowrap text-zinc-600">{row.date}</TableCell>
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
                              : "bg-amber-100 text-amber-800"
                        }
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-700">{row.responsavel}</TableCell>
                    <TableCell className="text-right text-xs text-zinc-500">{row.link}</TableCell>
                  </TableRow>
                ))}
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
                {panfletagemRows.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell className="whitespace-nowrap text-zinc-600">{row.date}</TableCell>
                    <TableCell>{row.equipe}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {row.panfletos.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.locais}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.fotos}</TableCell>
                    <TableCell className="text-zinc-600">{row.obs}</TableCell>
                  </TableRow>
                ))}
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
          className="col-span-8 rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">Ações por Mês</h3>
              <p className="text-sm text-zinc-500">Comparativo mensal de atividades</p>
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
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} />
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
          className="col-span-4 rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50"
        >
          <h3 className="text-lg font-semibold text-zinc-900">Distribuição por Região</h3>
          <p className="text-sm text-zinc-500">Ações por área geográfica</p>
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
                <span className="text-sm font-medium text-zinc-900">{region.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Reincidence Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="col-span-6 rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50"
        >
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
        </motion.div>

        {/* Critical Regions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="col-span-6 rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50"
        >
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
        </motion.div>

        {/* Team Productivity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="col-span-12 rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-zinc-900">Produtividade da Equipe</h3>
            <p className="text-sm text-zinc-500">Performance individual no mês</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {teamProductivity.map((member, index) => (
              <div
                key={member.name}
                className="rounded-2xl border border-zinc-100 p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#f318e3] to-[#6a0eaf] text-lg font-semibold text-white">
                    {member.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900">{member.name}</p>
                    <p className="text-sm text-zinc-500">{member.actions} ações no mês</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Taxa de conclusão</span>
                    <span className="font-semibold text-zinc-900">{member.completion}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${member.completion}%` }}
                      transition={{ duration: 1, delay: 0.8 + index * 0.1 }}
                      className="h-full rounded-full bg-gradient-to-r from-[#f318e3] to-[#6a0eaf]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
