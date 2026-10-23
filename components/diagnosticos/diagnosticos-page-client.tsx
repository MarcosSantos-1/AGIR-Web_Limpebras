"use client";

import Link from "next/link";
import { useCustomPontosViciados } from "@/contexts/custom-pontos-viciados-context";
import { MAPA_MARKERS } from "@/lib/map-features";
import { buildSurveyRows, surveyCodes } from "@/lib/survey-workspace";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, ArrowLeft, ArrowRight, CalendarDays, CheckCheck, ChevronDown, ClipboardCheck, Clock3, FileSpreadsheet, FolderOpen, Layers3, Loader2, MapPin, MessageSquareWarning, Pencil, Plus, Search, Sparkles, TriangleAlert, Smartphone, Map as MapIcon, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { historicalRequest } from "@/lib/firestore/diagnosticos";
import { saveLevantamento, cancelLevantamento, enrollSurveyPoints, subscribeLevantamentos, subscribeQuarterlyDiagnostics } from "@/lib/firestore/levantamentos";
import { QUESTIONNAIRE_VERSION, localToday, newDiagnostic, periodForDate, type Diagnostic, type HistoricalSource } from "@/lib/diagnosticos";
import { buildLevantamentoWorkbook, newestByPoint, periodDates, periodLabel, periodFromTitle, surveyProgress, type Levantamento } from "@/lib/levantamentos";
import { mergeSurveyRows } from "@/lib/levantamento-rows";
import { DiagnosticEditor, inputClass } from "./diagnostic-editor";
import { PointsPanel } from "./points-panel";

const currentPeriod = periodForDate(localToday());
const brDate = (value?: string) => value ? value.split("-").reverse().join("/") : "—";
function surveyRecords(survey: Levantamento, records: Diagnostic[]) {
  return records.filter((r) => r.sourceId === (survey.sourceId ?? survey.id) || (!survey.sourceId && r.sourceId === "campo" && r.period === survey.period));
}

export function DiagnosticosPageClient() {
  const [tab, setTab] = useState<"levantamentos" | "pontos">("levantamentos");
  return <AppShell responsive title="Diagnósticos" subtitle="Levantamentos e acompanhamento dos pontos viciados">
    <div className="mb-7 flex w-fit max-w-full gap-1 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900" role="tablist" aria-label="Diagnósticos">
      {[{ id: "levantamentos" as const, label: "Levantamentos", icon: FileSpreadsheet }, { id: "pontos" as const, label: "Pontos Viciados", icon: MapPin }].map(({ id, label, icon: Icon }) => <button key={id} id={`tab-${id}`} role="tab" aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => setTab(id)} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition sm:px-6 ${tab === id ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/10" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}><Icon className="h-4 w-4" />{label}</button>)}
    </div>
    <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>{tab === "levantamentos" ? <LevantamentosPanel /> : <PointsPanel />}</div>
  </AppShell>;
}

function LevantamentosPanel() {
  const { user } = useAuth();
  const [sources, setSources] = useState<HistoricalSource[]>([]);
  const [metadata, setMetadata] = useState<Levantamento[]>([]);
  const [records, setRecords] = useState<Diagnostic[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [cloudError, setCloudError] = useState("");
  const [cloudReady, setCloudReady] = useState(false);
  const [metaReady, setMetaReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState("");
  const [selected, setSelected] = useState<Levantamento | null>(null);
  const [baseline, setBaseline] = useState<Diagnostic[]>([]);
  const [editor, setEditor] = useState<Diagnostic | null>(null);
  const [editingMeta, setEditingMeta] = useState<Levantamento | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [cancelling, setCancelling] = useState<Levantamento | null>(null);
  const { customPontosViciados } = useCustomPontosViciados();
  const allPoints = useMemo(() => { const map = new Map(MAPA_MARKERS.filter(p => p.type === "ponto-viciado").map(p => [p.id,p])); for (const p of customPontosViciados) map.set(p.id,p); return [...map.values()]; }, [customPontosViciados]);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [page, setPage] = useState(1);
  const cache = useRef(new Map<string, Diagnostic[]>());

  useEffect(() => {
    if (!user) return;
    let active = true;
    historicalRequest().then((result) => { if (active) { setSources(result.sources); setReady(true); setError(""); } }).catch((e) => { if (active) { setError(e.message); setReady(true); } });
    const offMeta = subscribeLevantamentos((items) => { setMetadata(items); setMetaReady(true); }, (e) => { setCloudError(e.message); setMetaReady(true); });
    const offRecords = subscribeQuarterlyDiagnostics((items) => { setRecords(items); setCloudReady(true); }, (e) => { setCloudError(e.message); setCloudReady(false); });
    return () => { active = false; offMeta(); offRecords(); };
  }, [user, retry]);

  const surveys = useMemo(() => {
    const items: Levantamento[] = sources.map((source) => ({ id: `levantamento-hist-${source.id}`, sourceId: source.id, period: source.period, title: periodLabel(source.period), status: "concluido", expectedCodes: [], notes: "", revision: 0 }));
    const merged = new Map(items.map((item) => [item.id, item]));
    for (const item of metadata) merged.set(item.id, item);
    return [...merged.values()].filter(s => s.status !== "cancelado").map(s => ({ ...s, expectedCodes: surveyCodes(s, allPoints) })).sort((a, b) => Number(b.status === "em-preenchimento") - Number(a.status === "em-preenchimento") || b.period.localeCompare(a.period) || (b.sourceId ?? b.id).localeCompare(a.sourceId ?? a.id));
  }, [sources, metadata, allPoints]);
  useEffect(() => { for (const survey of metadata) { if (survey.status === "em-preenchimento" && !survey.sourceId && allPoints.some(p => !survey.expectedCodes.includes(p.id))) enrollSurveyPoints(survey.id, allPoints.map(p => p.id)).catch(e => toast.error(e.message)); } }, [metadata, allPoints]);
  const activeSelected = selected ? surveys.find((survey) => survey.id === selected.id) ?? selected : null;

  async function loadSource(id: string): Promise<Diagnostic[]> {
    const cached = cache.current.get(id);
    if (cached) return cached;
    const result = await historicalRequest(id);
    cache.current.set(id, result.records);
    return result.records;
  }
  async function loadBaseline(survey: Levantamento) {
    const id = survey.sourceId ?? sources.at(-1)?.id;
    return id ? loadSource(id) : [];
  }
  async function openSurvey(survey: Levantamento) {
    setBusy(survey.id);
    try {
      const rows = await loadBaseline(survey);
      if (!survey.sourceId && survey.revision === 0) {
        if (!cloudReady || !metaReady || cloudError) throw new Error("Aguarde a conexão com o Firebase antes de iniciar o levantamento.");
        await saveLevantamento(survey);
      }
      setBaseline(rows); setSelected(survey); setSearch(""); setPage(1); setFilter("todos");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível abrir o levantamento."); }
    finally { setBusy(""); }
  }
  async function download(survey: Levantamento) {
    setBusy(survey.id);
    try {
      if (!cloudReady || cloudError) throw new Error("Aguarde a leitura das atualizações do Firebase antes de baixar a planilha.");
      const base = await loadBaseline(survey);
      const rows = buildSurveyRows(survey, allPoints, base, records);
      const workbook = await buildLevantamentoWorkbook(rows, survey.sourceId ?? QUESTIONNAIRE_VERSION);
      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `Levantamento-LoDIR-${survey.sourceId ?? survey.period}.xlsx`; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível baixar o levantamento."); }
    finally { setBusy(""); }
  }
  async function saveMeta() {
    if (!editingMeta) return;
    setBusy("meta");
    try {
      const rows = await loadBaseline(editingMeta);
      const next = { ...editingMeta, expectedCodes: editingMeta.expectedCodes.length ? editingMeta.expectedCodes : rows.map((r) => r.pointId) };
      if (next.status === "concluido" && surveys.find((item) => item.id === next.id)?.status === "em-preenchimento") {
        const progress = surveyProgress(next.expectedCodes, surveyRecords(next, records));
        if (progress.completed < progress.total) throw new Error("Conclua todos os pontos antes de encerrar o levantamento.");
      }
      await saveLevantamento(next); setEditingMeta(null); toast.success("Levantamento atualizado.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível atualizar."); }
    finally { setBusy(""); }
  }

  if (editor) return <DiagnosticEditor key={editor.id} initial={editor} onClose={() => setEditor(null)} onSaved={() => setEditor(null)} />;
  if (activeSelected) {
    const survey = activeSelected;
    const updates = newestByPoint(surveyRecords(survey, records));
    const originals = new Map(baseline.map((r) => [r.pointId, r]));
    const historicalRows = survey.sourceId ? mergeSurveyRows(baseline, [...updates.values()]) : [];
    const codes = new Set([...(survey.sourceId ? historicalRows.map((r) => r.pointId) : survey.expectedCodes), ...updates.keys()]);
    const rows = buildSurveyRows(survey, allPoints, baseline, records);
    const shown = rows.filter((row) => (!search || `${row.pointId} ${row.answers.endereco}`.toLowerCase().includes(search.toLowerCase())) && (filter === "todos" || (filter === "pendente" ? !updates.has(row.pointId) : row.state === filter)));
    const progress = surveyProgress([...codes], [...updates.values()]);
    return <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-2"><Button variant="ghost" onClick={() => setSelected(null)}><ArrowLeft className="mr-2 h-4 w-4" />Todos os levantamentos</Button><Button variant="outline" asChild><Link href={`/diagnosticos/mapa?levantamento=${encodeURIComponent(survey.id)}`}><MapIcon className="mr-2 h-4 w-4" />Ver no mapa</Link></Button></div>
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 dark:border-emerald-900 dark:from-emerald-950 dark:to-zinc-900"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Levantamento trimestral</p><h2 className="mt-2 text-2xl font-semibold">{survey.title}</h2><p className="mt-2 flex items-center gap-2 text-sm text-zinc-500"><CalendarDays className="h-4 w-4" />{periodDates(survey.period)}</p></div><Button disabled={!!busy} onClick={() => void download(survey)}><ArrowDownToLine className="mr-2 h-4 w-4" />Baixar planilha</Button></div><p className="mt-5 text-sm">{survey.status === "em-preenchimento" ? `${progress.completed} de ${progress.total} pontos concluídos · ${progress.percent}%` : `${codes.size} pontos no levantamento histórico`}</p></div>
      {cloudError && <p role="alert" className="rounded-xl bg-orange-50 p-4 text-sm text-orange-900">Não foi possível carregar as atualizações: {cloudError}</p>}
      <div className="flex flex-wrap gap-3"><div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" /><input aria-label="Buscar ponto no levantamento" className={`${inputClass} pl-9`} placeholder="Buscar código ou endereço" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div><select aria-label="Filtrar preenchimento" className={`${inputClass} sm:w-52`} value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}><option value="todos">Todos os pontos</option><option value="pendente">Ainda não atualizados</option><option value="rascunho">Rascunhos</option><option value="concluido">Concluídos</option></select>{!survey.sourceId && <Button disabled={!cloudReady || !!cloudError} onClick={() => { const r = newDiagnostic(); setEditor({ ...r, kind: "trimestral", period: survey.period, sourceId: survey.id, answers: { lote: "Lote 3", antiguidade: "“Novo”, surgiu durante este trimestre." } }); }}><Plus className="mr-2 h-4 w-4" />Ponto novo</Button>}</div>
      <p className="text-xs text-zinc-500">{shown.length} pontos · Os dados cadastrais anteriores são referências. Cada conclusão confirma o preenchimento deste trimestre.</p>
      <div className="grid gap-3 lg:grid-cols-2">{shown.slice((page - 1) * 20, page * 20).map((row) => {
        const saved = updates.has(row.pointId);
        const isNew = String(row.answers.antiguidade ?? "").toLowerCase().includes("novo") || !originals.has(row.pointId) && !survey.expectedCodes.includes(row.pointId);
        return <article key={row.pointId} className="rounded-2xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-emerald-600" />{row.pointId}</h3><span className={`rounded-full px-2.5 py-1 text-xs ${saved && row.state === "concluido" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{saved ? row.state === "concluido" ? "Concluído" : "Em preenchimento" : survey.sourceId ? "Histórico" : "Pendente"}</span></div><p className="mt-3 text-sm">{String(row.answers.endereco ?? "Endereço a preencher")}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2">{isNew ? <span className="flex items-center gap-1 text-xs font-semibold text-orange-600"><Sparkles className="h-3.5 w-3.5" />Ponto novo neste levantamento</span> : <span className="text-xs text-zinc-500">{String(row.answers.subprefeitura ?? "")}</span>}<Button size="sm" variant="outline" disabled={!cloudReady || !!cloudError} onClick={() => setEditor(row)}><Pencil className="mr-2 h-3.5 w-3.5" />{saved || survey.sourceId ? "Consultar / atualizar" : "Preencher"}</Button></div></article>;
      })}</div>
      <div className="flex items-center justify-center gap-4"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button><span className="text-xs text-zinc-500">{page} / {Math.max(1, Math.ceil(shown.length / 20))}</span><Button variant="outline" disabled={page * 20 >= shown.length} onClick={() => setPage(page + 1)}>Próxima</Button></div>
    </div>;
  }

  return <div className="space-y-7">
    <div className="flex flex-wrap gap-3"><Button asChild variant="outline" className="h-12 rounded-2xl border-emerald-200 text-emerald-800"><Link href="/diagnosticos/campo"><Smartphone className="mr-2 h-5 w-5" />Preenchimento do celular</Link></Button><Button asChild variant="outline" className="h-12 rounded-2xl"><Link href="/diagnosticos/mapa"><MapIcon className="mr-2 h-5 w-5" />Ver no mapa</Link></Button></div>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700"><Layers3 className="h-4 w-4" />Arquivo de levantamentos</div><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Levantamentos trimestrais</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">Preenchimento da equipe, evolução por ponto e levantamentos prontos para copiar na matriz oficial.</p></div><Button className="h-11 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" title={surveys.some(s => s.status === "em-preenchimento") ? "Conclua ou cancele o levantamento atual antes de criar outro" : "Criar levantamento"} disabled={!metaReady || surveys.some(s => s.status === "em-preenchimento")} onClick={() => { setNewTitle(periodLabel(currentPeriod)); setCreating(true); }}><Plus className="mr-2 h-4 w-4" />Novo levantamento</Button></div>
    {error && <div role="alert" className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">{error}<Button variant="outline" className="ml-3" onClick={() => setRetry((v) => v + 1)}>Tentar novamente</Button></div>}
    {cloudError && <div role="alert" className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">Não foi possível ler as atualizações do Firebase. O progresso não está disponível: {cloudError}<Button className="ml-3" variant="outline" onClick={() => { setCloudError(""); setRetry((v) => v + 1); }}>Tentar novamente</Button></div>}
    {!ready ? <p role="status" className="flex justify-center gap-2 py-12 text-sm text-zinc-500"><Loader2 className="h-5 w-5 animate-spin" />Organizando os levantamentos…</p> : <div className="grid gap-5 xl:grid-cols-2">{surveys.map((survey) => {
      const source = sources.find((s) => s.id === survey.sourceId);
      const working = survey.status === "em-preenchimento";
      const progress = surveyProgress(survey.expectedCodes, surveyRecords(survey, records));
      const total = working ? survey.expectedCodes.length ? progress.total : source?.count ?? progress.total : source?.count ?? progress.total;
      const newCount = source?.newCount ?? progress.newPoints;
      const available = cloudReady && metaReady && !cloudError;
      return <article key={survey.id} className={`relative overflow-hidden rounded-3xl border bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-900 ${working ? "border-emerald-300 ring-1 ring-emerald-100 dark:border-emerald-800 dark:ring-emerald-950 xl:col-span-2" : "border-zinc-200 dark:border-zinc-800"}`}>
        {working && <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />}
        <div className={`p-5 sm:p-6 ${working ? "lg:flex lg:items-start lg:gap-8" : ""}`}>
          <div className="flex min-w-0 flex-1 items-start gap-4"><div className={`relative rounded-2xl p-4 ${working ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950" : "bg-slate-100 text-slate-500 dark:bg-zinc-800"}`}><FileSpreadsheet className="h-8 w-8" />{working && <span className="absolute -right-1 -top-1 rounded-full border-2 border-white bg-emerald-500 p-1"><Pencil className="h-3 w-3 text-white" /></span>}</div><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${working ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"}`}>{working ? <Clock3 className="h-3.5 w-3.5" /> : <CheckCheck className="h-3.5 w-3.5" />}{working ? "Em preenchimento" : "Levantamento histórico"}</span>{survey.sourceId?.includes("rev-") && <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">Revisão · 19/10/2026</span>}</div><h3 className="text-xl font-semibold tracking-tight">{survey.title}</h3><p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500"><CalendarDays className="h-3.5 w-3.5 shrink-0" />{periodDates(survey.period)}</p>{source?.checkedFrom && <p className="mt-1 text-xs text-zinc-400">Checagens: {brDate(source.checkedFrom)} a {brDate(source.checkedTo)}</p>}</div></div>
          <div className={`mt-5 ${working ? "lg:mt-0 lg:w-80" : ""}`}><div className="mb-3 flex flex-wrap items-center gap-4 text-sm"><span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300"><MapPin className="h-4 w-4 text-zinc-400" /><strong>{total}</strong> pontos</span><span className="flex items-center gap-1.5 text-xs font-medium text-orange-600"><Sparkles className="h-4 w-4" />{newCount} novos</span></div>{working && <div className="mb-4"><div className="mb-2 flex items-center justify-between text-xs"><span className="text-zinc-500">{available ? `${progress.completed} de ${total} concluídos` : "Carregando progresso…"}</span><strong className="text-lg text-emerald-700">{available ? `${total ? Math.round(progress.completed / total * 100) : 0}%` : "—"}</strong></div><div role="progressbar" aria-label={`Conclusão de ${survey.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={available ? progress.percent : undefined} className="h-2.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950"><div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-[width] duration-500" style={{ width: `${available ? progress.percent : 0}%` }} /></div></div>}
            <div className="flex flex-wrap gap-2"><Button disabled={!!busy} variant={working ? "default" : "outline"} className={`rounded-xl ${working ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}`} onClick={() => void openSurvey(survey)}>{busy === survey.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderOpen className="mr-2 h-4 w-4" />}{working ? "Continuar preenchimento" : "Abrir levantamento"}<ArrowRight className="ml-2 h-3.5 w-3.5" /></Button><Button aria-label={`Baixar ${survey.title}${survey.sourceId?.includes("rev-") ? " revisão 19/10" : ""}`} title="Baixar Excel com as 49 colunas originais" variant="outline" className="rounded-xl" disabled={!!busy || !available} onClick={() => void download(survey)}><ArrowDownToLine className="h-4 w-4" /></Button><Button asChild variant="outline" className="rounded-xl"><Link aria-label={`Ver ${survey.title} no mapa`} href={`/diagnosticos/mapa?levantamento=${encodeURIComponent(survey.id)}`}><MapIcon className="h-4 w-4" /></Link></Button></div>
          </div>
        </div>
        <details className="group border-t border-orange-100 bg-orange-50/50 dark:border-orange-950 dark:bg-orange-950/10"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-xs font-medium text-orange-700 sm:px-6"><span className="flex items-center gap-2"><MessageSquareWarning className="h-4 w-4" />Observações e atualizações{(survey.notes || source?.issues.length) ? <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> : null}</span><ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></summary><div className="space-y-3 px-5 pb-5 text-sm sm:px-6"><p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-300">{survey.notes || "Nenhuma observação adicionada pela equipe."}</p>{source?.issues.map((issue) => <p key={issue.row} className="flex items-start gap-2 text-xs text-orange-700"><TriangleAlert className="h-4 w-4 shrink-0" />{issue.code} · linha {issue.row}: {issue.reason}</p>)}{source && <p className="break-words text-xs text-zinc-400">Arquivo de origem: {source.file}</p>}<p className="text-xs text-zinc-400">{survey.updatedAtMs ? `Atualizado em ${new Date(survey.updatedAtMs).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : "Sem atualizações da equipe"}</p><Button size="sm" variant="outline" disabled={!available} onClick={() => setEditingMeta(survey)}><Pencil className="mr-2 h-3.5 w-3.5" />Editar observações e situação</Button>{working && progress.completed === 0 && <Button size="sm" variant="ghost" className="ml-2 text-red-600" disabled={!available} onClick={() => setCancelling(survey)}><XCircle className="mr-2 h-4 w-4" />Cancelar levantamento</Button>}</div></details>
      </article>;
    })}</div>}
    <p className="flex items-start gap-2 text-xs leading-relaxed text-zinc-400"><ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0" />Downloads com os três módulos e as mesmas 49 colunas do levantamento. Pontos novos aparecem ao final, destacados em amarelo. O percentual considera pontos concluídos neste levantamento.</p>
    <Dialog open={!!editingMeta} onOpenChange={(open) => { if (!open && !busy) setEditingMeta(null); }}><DialogContent><DialogHeader><DialogTitle>Atualizar levantamento</DialogTitle><DialogDescription>{editingMeta?.title} · Observações compartilhadas com a equipe.</DialogDescription></DialogHeader><label className="text-sm" htmlFor="survey-notes">Observações</label><textarea id="survey-notes" className={`${inputClass} min-h-32`} maxLength={10000} value={editingMeta?.notes ?? ""} onChange={(e) => setEditingMeta((s) => s ? { ...s, notes: e.target.value } : null)} /><label className="text-sm" htmlFor="survey-state">Situação</label><select id="survey-state" className={inputClass} value={editingMeta?.status} onChange={(e) => setEditingMeta((s) => s ? { ...s, status: e.target.value as Levantamento["status"] } : null)}><option value="em-preenchimento">Em preenchimento / revisão</option><option value="concluido">Concluído</option></select><Button disabled={!!busy} onClick={() => void saveMeta()}>{busy ? "Salvando…" : "Salvar atualização"}</Button></DialogContent></Dialog>
    <Dialog open={!!cancelling} onOpenChange={(open) => { if (!open && !busy) setCancelling(null); }}><DialogContent><DialogHeader><DialogTitle>Cancelar este levantamento?</DialogTitle><DialogDescription>Permitido somente com zero pontos concluídos. Os rascunhos existentes serão preservados no histórico, mas o levantamento sairá da lista de preenchimento.</DialogDescription></DialogHeader><Button variant="destructive" disabled={!!busy} onClick={async () => { if (!cancelling) return; setBusy("cancel"); try { await cancelLevantamento(cancelling); setCancelling(null); toast.success("Levantamento cancelado."); } catch(e) { toast.error(e instanceof Error ? e.message : "Falha ao cancelar."); } finally { setBusy(""); } }}>Confirmar cancelamento</Button></DialogContent></Dialog>
    <Dialog open={creating} onOpenChange={setCreating}><DialogContent><DialogHeader><DialogTitle>Novo levantamento trimestral</DialogTitle><DialogDescription>A lista de pontos do catálogo será mantida como referência para o progresso. Novos pontos poderão ser acrescentados durante o preenchimento.</DialogDescription></DialogHeader><label htmlFor="survey-period" className="text-sm">Título do levantamento</label><input id="survey-period" className={inputClass} placeholder="4º trimestre de 2026" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /><Button disabled={!!busy || !cloudReady || !metaReady} onClick={async () => {
      const newPeriod = periodFromTitle(newTitle);
      if (!newPeriod) { toast.error("Use um título como 4º trimestre de 2026."); return; }
      if (surveys.some(s => s.status === "em-preenchimento")) { toast.error("Conclua ou cancele o levantamento em preenchimento antes de criar outro."); return; }
      if (surveys.some((s) => !s.sourceId && s.period === newPeriod)) { toast.info("Já existe um levantamento de preenchimento para esse trimestre."); setCreating(false); return; }
      setBusy("create");
      try { await saveLevantamento({ id: `levantamento-${newPeriod}-${crypto.randomUUID()}`, period: newPeriod, title: periodLabel(newPeriod), expectedCodes: allPoints.map(p => p.id), status: "em-preenchimento", notes: "", revision: 0 }); setCreating(false); toast.success("Levantamento criado."); } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao criar."); } finally { setBusy(""); }
    }}><Plus className="mr-2 h-4 w-4" />Criar levantamento</Button></DialogContent></Dialog>
  </div>;
}
