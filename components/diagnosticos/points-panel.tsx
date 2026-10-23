"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ClipboardList, Download, FileSpreadsheet, Loader2, Plus, Search, Trash2, Pencil, Eye, CloudUpload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { deleteDiagnostic, historicalRequest, subscribeDiagnostics } from "@/lib/firestore/diagnosticos";
import { FIELDS, diagnosticStatus, localToday, newDiagnostic, type Diagnostic, type HistoricalSource } from "@/lib/diagnosticos";
import { DiagnosticEditor, draftKey, inputClass } from "./diagnostic-editor";
import { deleteStoredFilesByPublicUrls } from "@/lib/storage/delete-stored-files";

function downloadJson(records: Diagnostic[]) {
  const blob = new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), records }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `diagnosticos-${localToday()}.json`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadExcel(records: Diagnostic[]) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Diagnósticos");
  sheet.columns = [
    { header: "ID do diagnóstico", key: "id", width: 36 }, { header: "Tipo", key: "kind", width: 15 },
    { header: "Competência", key: "period", width: 15 }, { header: "Estado", key: "state", width: 15 },
    ...FIELDS.map((f) => ({ header: f.label, key: f.key, width: f.key === "endereco" ? 50 : 25 })),
    { header: "Situação na visita", key: "observedStatus", width: 30 }, { header: "Observações", key: "notes", width: 50 },
    { header: "Fotos (URLs)", key: "photos", width: 50 }, { header: "Fonte", key: "source", width: 50 },
    { header: "Versão do questionário", key: "questionnaireVersion", width: 30 },
  ];
  for (const record of records) {
    const row = sheet.addRow({ ...record.answers, id: record.id, kind: record.kind, period: record.period, state: record.state, observedStatus: record.kind === "visita" ? diagnosticStatus(record) : "", notes: record.notes, photos: record.photos.map((p) => p.url).join("\n"), source: record.source?.file ?? "Campo", questionnaireVersion: record.questionnaireVersion });
    const date = String(record.answers.dataChecagem ?? "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      row.getCell("dataChecagem").value = new Date(`${date}T12:00:00Z`);
      row.getCell("dataChecagem").numFmt = "dd/mm/yyyy";
    }
  }
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: sheet.columnCount } };
  const bytes = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `diagnosticos-${localToday()}.xlsx`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PointsPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"firebase" | "historico">("historico");
  const [period, setPeriod] = useState("2026-T3");
  const [sourceId, setSourceId] = useState("2026-T3-rev-20261019");
  const [sources, setSources] = useState<HistoricalSource[]>([]);
  const [historical, setHistorical] = useState<Diagnostic[]>([]);
  const [records, setRecords] = useState<Diagnostic[]>([]);
  const [cloudReady, setCloudReady] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [cloudError, setCloudError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search.toLocaleLowerCase("pt-BR"));
  const [territory, setTerritory] = useState("");
  const [state, setState] = useState("");
  const [kind, setKind] = useState("");
  const [cloudSource, setCloudSource] = useState("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ record: Diagnostic; readOnly: boolean } | null>(null);
  const [deleting, setDeleting] = useState<Diagnostic | null>(null);
  const [importConfirm, setImportConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeDiagnostics(period, (data) => { setRecords(data); setCloudReady(true); setCloudError(""); }, (error) => { setCloudError(`Não foi possível ler o Firebase: ${error.message}`); setCloudReady(true); });
  }, [period, user, retry]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    historicalRequest(sourceId).then((data) => {
      if (cancelled) return;
      setSources(data.sources); setHistorical(data.records); setHistoryError(""); setHistoryReady(true);
    }).catch((error) => { if (!cancelled) { setHistoryError(error.message); setHistoryReady(true); } });
    return () => { cancelled = true; };
  }, [sourceId, user, retry]);

  const source = sources.find((s) => s.id === sourceId);
  const data = tab === "firebase" ? records : historical;
  const territories = useMemo(() => [...new Set(data.map((r) => String(r.answers.subprefeitura ?? "")).filter(Boolean))].sort(), [data]);
  const filtered = useMemo(() => data.filter((r) =>
    (!query || [r.pointId, r.answers.endereco, r.answers.distrito, r.notes].join(" ").toLocaleLowerCase("pt-BR").includes(query)) &&
    (!territory || r.answers.subprefeitura === territory) && (!state || r.state === state) && (!kind || r.kind === kind) &&
    (tab !== "firebase" || !cloudSource || r.sourceId === cloudSource)), [data, query, territory, state, kind, tab, cloudSource]);
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  const ready = tab === "firebase" ? cloudReady : historyReady;
  const error = tab === "firebase" ? cloudError : historyError;
  const unique = new Set(data.map((r) => r.pointId)).size;

  function switchTab(next: "firebase" | "historico") { setTab(next); setPage(1); setTerritory(""); setState(""); setKind(""); setCloudSource(""); }
  function resumeDraft() {
    try {
      const raw = user && localStorage.getItem(draftKey(user.uid));
      if (!raw) { toast.info("Nenhum rascunho local encontrado nesta conta."); return; }
      const record = JSON.parse(raw) as Diagnostic;
      if (record.schemaVersion !== 1 || !record.answers || !record.id) throw new Error();
      setEditor({ record, readOnly: false });
    } catch { toast.error("Não foi possível recuperar o rascunho local."); }
  }
  async function importSource() {
    setBusy(true);
    try {
      const result = await historicalRequest(sourceId, true);
      toast.success(`${result.created} registros importados; ${result.skipped} já existentes preservados.`);
      setPeriod(source?.period ?? "2026-T3"); setCloudReady(false); switchTab("firebase"); setRetry((v) => v + 1); setImportConfirm(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao importar."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteDiagnostic(deleting);
      await deleteStoredFilesByPublicUrls(deleting.photos.map((p) => p.url)).catch(() => toast.warning("Registro excluído; não foi possível remover todos os arquivos de foto."));
      toast.success("Diagnóstico excluído do Firebase."); setDeleting(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao excluir."); }
    finally { setBusy(false); }
  }

  if (editor) return <DiagnosticEditor key={editor.record.id} initial={editor.record} readOnly={editor.readOnly} onClose={() => setEditor(null)} onSaved={(record) => { setEditor(null); if (record.period !== period) { setCloudReady(false); setRecords([]); } setPeriod(record.period); switchTab("firebase"); }} />;

  return <div className="space-y-6">
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="flex items-start gap-3"><div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-950"><ClipboardList className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Cada visita conta uma parte da história</h2><p className="mt-1 max-w-xl text-sm text-zinc-500">Consulte levantamentos anteriores, registre o que encontrou e acompanhe as mudanças de cada ponto.</p></div></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={resumeDraft}>Retomar rascunho</Button><Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setEditor({ record: newDiagnostic(), readOnly: false })}><Plus className="mr-2 h-4 w-4" />Novo diagnóstico</Button></div>
    </section>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Origem dos registros"><Button variant={tab === "historico" ? "default" : "outline"} onClick={() => switchTab("historico")}><FileSpreadsheet className="mr-2 h-4 w-4" />Referência histórica</Button><Button variant={tab === "firebase" ? "default" : "outline"} onClick={() => switchTab("firebase")}><ClipboardList className="mr-2 h-4 w-4" />Diagnósticos atualizados</Button></div>
    <div className="grid gap-3 sm:grid-cols-3">{[["Registros nesta seleção", data.length], ["Pontos acompanhados", unique], ["Rascunhos", data.filter((r) => r.state === "rascunho").length]].map(([label, value]) => <div key={label} className="rounded-2xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold">{ready && !error ? value : "—"}</p></div>)}</div>
    <section className="space-y-4 rounded-2xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1"><label htmlFor="diag-source" className="mb-1.5 block text-sm font-medium">{tab === "historico" ? "Levantamento de origem" : "Competência"}</label>{tab === "historico" ? <select id="diag-source" className={inputClass} value={sourceId} disabled={!historyReady} onChange={(e) => { setHistoryReady(false); setHistorical([]); setSourceId(e.target.value); setPage(1); }}>{sources.map((s) => <option value={s.id} key={s.id}>{s.label} · {s.count} registros</option>)}</select> : <input id="diag-source" className={inputClass} placeholder="2026-T3" value={period} onChange={(e) => { setCloudReady(false); setRecords([]); setPeriod(e.target.value.toUpperCase()); setPage(1); }} />}</div>
        {tab === "historico" && <Button variant="outline" disabled={!ready || !!error || busy} onClick={() => setImportConfirm(true)}><CloudUpload className="mr-2 h-4 w-4" />Importar esta versão</Button>}
        <Button variant="outline" disabled={!filtered.length || !ready || !!error || busy} onClick={async () => { setBusy(true); try { await downloadExcel(filtered); } catch { toast.error("Não foi possível exportar a planilha."); } finally { setBusy(false); } }}><Download className="mr-2 h-4 w-4" />Excel analítico</Button>
        <Button variant="outline" disabled={!filtered.length || !ready || !!error} onClick={() => downloadJson(filtered)}>JSON</Button>
      </div>
      {tab === "historico" && <p className="text-xs text-zinc-500">Consulta dos arquivos originais. Importe a versão escolhida para editar no Firebase. Revisões do mesmo trimestre ficam separadas e não devem ser somadas. Excel exporta os registros filtrados para análise; não é o modelo de entrega oficial.</p>}
      {tab === "firebase" && <div className="space-y-2"><label htmlFor="diag-cloud-source" className="block text-sm font-medium">Origem e revisão</label><select id="diag-cloud-source" className={inputClass} value={cloudSource} onChange={(e) => { setCloudSource(e.target.value); setPage(1); }}><option value="">Todas as origens e revisões</option>{[...new Set(records.map((r) => r.sourceId))].sort().map((id) => <option key={id} value={id}>{id === "campo" ? "Registros de campo" : sources.find((s) => s.id === id)?.label ?? id}</option>)}</select><p className="text-xs text-zinc-500">Revisões do mesmo ponto e trimestre são registros separados. Selecione uma origem para comparar ou exportar sem misturar revisões. O Excel é analítico e não substitui a matriz oficial.</p></div>}
      {!!source?.issues.length && tab === "historico" && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">{source.issues.map((issue) => <p key={issue.row}>Linha {issue.row} · {issue.code}: {issue.reason}</p>)}</div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative"><label htmlFor="diag-search" className="sr-only">Buscar código, endereço ou distrito</label><Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" /><input id="diag-search" className={`${inputClass} pl-9`} placeholder="Código, endereço ou distrito" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <select aria-label="Filtrar subprefeitura" className={inputClass} value={territory} onChange={(e) => { setTerritory(e.target.value); setPage(1); }}><option value="">Todas as subprefeituras</option>{territories.map((s) => <option key={s}>{s}</option>)}</select>
        <select aria-label="Filtrar estado" className={inputClass} value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}><option value="">Todos os estados</option><option value="rascunho">Rascunho</option><option value="concluido">Concluído</option><option value="importado">Importado</option></select>
        <select aria-label="Filtrar tipo" className={inputClass} value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }}><option value="">Todos os tipos</option><option value="visita">Visita de campo</option><option value="trimestral">Trimestral</option></select>
      </div>
    </section>
    {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><p>{error}</p><p className="mt-2">{tab === "firebase" ? "Verifique a conexão e as regras de acesso à coleção diagnosticos." : "A consulta às planilhas valida o login pelo Firebase Authentication e não depende das regras do Firestore."}</p><Button variant="outline" className="mt-3" onClick={() => { setHistoryReady(false); setCloudReady(false); setRetry((v) => v + 1); }}>Tentar novamente</Button></div> : !ready ? <div className="flex justify-center gap-2 p-12" role="status"><Loader2 className="h-5 w-5 animate-spin" />Carregando diagnósticos…</div> : <>
      <div className="flex justify-between text-sm text-zinc-500"><p>{filtered.length} registros encontrados</p><p>Página {currentPage} de {pages}</p></div>
      {!visible.length && <div className="rounded-2xl border border-dashed p-10 text-center"><ClipboardList className="mx-auto mb-3 h-8 w-8 text-zinc-400" /><h3 className="font-semibold">Nenhum diagnóstico nesta seleção</h3><p className="mt-2 text-sm text-zinc-500">Ajuste os filtros, crie uma visita ou importe um levantamento histórico.</p></div>}
      <div className="grid gap-4 xl:grid-cols-2">{visible.map((record) => <article key={record.id} className="flex flex-col rounded-2xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{record.pointId}</h3><p className="mt-1 text-xs text-zinc-500">{String(record.answers.subprefeitura ?? "")} · {String(record.answers.distrito ?? "")}</p></div><span className={`rounded-full px-2.5 py-1 text-xs ${record.state === "concluido" ? "bg-emerald-50 text-emerald-700" : record.state === "rascunho" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-700"}`}>{tab === "historico" ? "Planilha original" : record.state === "concluido" ? "Concluído" : record.state === "rascunho" ? "Rascunho" : "Importado"}</span></div>
        <p className="mt-4 text-sm font-medium">{String(record.answers.endereco ?? "Endereço não informado")}</p><p className="mt-2 text-sm text-zinc-500">{String(record.answers.dataChecagem ?? "").split("-").reverse().join("/")} · {record.kind === "visita" ? "Visita de campo" : "Levantamento trimestral"}</p>
        <p className="mt-3 rounded-xl bg-zinc-50 p-3 text-xs dark:bg-zinc-800">{diagnosticStatus(record)}</p>
        <p className="mt-3 break-words text-xs text-zinc-500">{record.photos.length} fotos · {record.sourceId === "campo" ? record.responsibleName || "Registro de campo" : record.sourceId}</p>
        <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => setEditor({ record, readOnly: true })}><Eye className="mr-2 h-4 w-4" />Detalhes</Button>{tab === "firebase" && <><Button variant="outline" size="sm" onClick={() => setEditor({ record, readOnly: false })}><Pencil className="mr-2 h-4 w-4" />Editar</Button><Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleting(record)}><Trash2 className="mr-2 h-4 w-4" />Excluir</Button></>}
          <Button variant="ghost" size="sm" onClick={() => { const fresh = newDiagnostic(); fresh.answers = { ...fresh.answers, ...Object.fromEntries(FIELDS.filter((f) => ["codigo", "subprefeitura", "sigla", "distrito", "endereco", "complemento", "latitude", "longitude", "lote"].includes(f.key)).map((f) => [f.key, record.answers[f.key] ?? ""])) }; fresh.pointId = record.pointId; setEditor({ record: fresh, readOnly: false }); }}>Nova visita</Button>
        </div>
      </article>)}</div>
      <div className="flex justify-center gap-3"><Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</Button><Button variant="outline" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Próxima</Button></div>
    </>}
    <Dialog open={!!deleting} onOpenChange={(open) => { if (!open && !busy) setDeleting(null); }}><DialogContent><DialogHeader><DialogTitle>Excluir diagnóstico de {deleting?.pointId}?</DialogTitle><DialogDescription>O registro será removido do Firebase e suas fotos serão excluídas do armazenamento. As planilhas originais serão preservadas. Esta ação não pode ser desfeita.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</Button><Button variant="destructive" disabled={busy} onClick={() => void remove()}>{busy ? "Excluindo…" : "Excluir diagnóstico"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={importConfirm} onOpenChange={(open) => { if (!busy) setImportConfirm(open); }}><DialogContent><DialogHeader><DialogTitle>Importar {source?.count} diagnósticos?</DialogTitle><DialogDescription>{source?.file}. A fonte e a linha de origem serão preservadas. Registros já existentes não serão substituídos. A revisão de 19/10 continua separada do levantamento anterior do mesmo trimestre.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setImportConfirm(false)}>Cancelar</Button><Button disabled={busy} onClick={() => void importSource()}>{busy ? "Importando…" : "Importar para Firebase"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
