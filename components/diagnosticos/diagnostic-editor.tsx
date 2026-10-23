"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Loader2, MapPin, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FIELDS, STEPS, diagnosticErrors, fieldVersion, periodForDate, type Diagnostic, type DiagnosticField } from "@/lib/diagnosticos";
import { compressImageFileIfNeeded } from "@/lib/image-compress";
import { uploadFileToPath, extensionForMime } from "@/lib/storage/upload-helpers";
import { saveDiagnostic } from "@/lib/firestore/diagnosticos";
import { deleteStoredFilesByPublicUrls } from "@/lib/storage/delete-stored-files";
import { useAuth } from "@/contexts/auth-context";
import { useUserProfile } from "@/contexts/user-profile-context";
import features from "@/data/features-PV.json";
import { toast } from "sonner";

export const inputClass = "min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const pointOptions = features.features;
export const draftKey = (uid: string) => `agir:diagnosticos:draft:${uid}`;

function Field({ field, record, change, error, readOnly }: { field: DiagnosticField; record: Diagnostic; change: (key: string, value: string | number) => void; error?: string; readOnly: boolean }) {
  const version = fieldVersion(field, record.questionnaireVersion);
  const value = record.answers[field.key] ?? "";
  return <div className={field.key === "endereco" || field.key === "complemento" ? "sm:col-span-2" : ""}>
    <label className="mb-1.5 block text-sm font-medium" htmlFor={`diag-${field.key}`}>{field.label}</label>
    {readOnly ? <p className="min-h-11 whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-sm dark:bg-zinc-800">{value === "" ? "Não informado" : value}</p> : field.type === "select" ?
      <select id={`diag-${field.key}`} className={inputClass} value={value} onChange={(e) => change(field.key, e.target.value)} aria-invalid={!!error} aria-describedby={error ? `error-${field.key}` : undefined}>
        <option value="">Selecione uma resposta</option>
        {value !== "" && !version.options.includes(String(value)) && <option value={value}>{value} (revisar alternativa)</option>}
        {version.options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select> : <input id={`diag-${field.key}`} className={inputClass} type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        step={field.key === "limpezas" ? "1" : "any"} min={field.key === "limpezas" ? 0 : field.key === "latitude" ? -90 : field.key === "longitude" ? -180 : undefined}
        max={field.key === "latitude" ? 90 : field.key === "longitude" ? 180 : undefined} value={value}
        list={field.key === "codigo" ? "diagnostic-points" : undefined}
        onChange={(e) => change(field.key, field.type === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value)} aria-invalid={!!error} aria-describedby={error ? `error-${field.key}` : undefined} />}
    {error && <p id={`error-${field.key}`} className="mt-1 text-sm text-red-600">{error}</p>}
    <details className="mt-1 text-xs text-zinc-500"><summary className="cursor-pointer">Instrução original · coluna {field.column}</summary><p className="whitespace-pre-line py-2">{version.instruction}</p></details>
  </div>;
}

export function DiagnosticEditor({ initial, readOnly = false, onClose, onSaved }: { initial: Diagnostic; readOnly?: boolean; onClose: () => void; onSaved: (record: Diagnostic) => void }) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [record, setRecord] = useState(initial);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [pending, setPending] = useState<{ id: string; file: File; preview: string }[]>([]);
  const [storageError, setStorageError] = useState(false);
  const pendingRef = useRef(pending);
  const contentRef = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(record) !== JSON.stringify(initial) || pending.length > 0;

  useEffect(() => { pendingRef.current = pending; }, [pending]);
  useEffect(() => () => { for (const p of pendingRef.current) URL.revokeObjectURL(p.preview); }, []);
  useEffect(() => {
    if (readOnly || !user || !dirty) return;
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(draftKey(user.uid), JSON.stringify(record)); setStorageError(false); }
      catch { setStorageError(true); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [record, readOnly, user, dirty]);
  useEffect(() => {
    if (!dirty || readOnly) return;
    const handler = (e: BeforeUnloadEvent) => {
      try { if (user) localStorage.setItem(draftKey(user.uid), JSON.stringify(record)); } catch { /* Best effort on unload. */ }
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, readOnly, user, record]);

  function change(key: string, value: string | number) {
    setRecord((prev) => {
      const answers = { ...prev.answers, [key]: key === "codigo" ? String(value).trim().toUpperCase() : value };
      if (key === "codigo") {
        const point = pointOptions.find((p) => p.setor === answers.codigo);
        if (point) Object.assign(answers, { endereco: point.address, subprefeitura: point.subprefeitura, sigla: point.setor.split("-")[0], latitude: point.centroid[0], longitude: point.centroid[1] });
      }
      return { ...prev, answers, pointId: String(answers.codigo ?? "") };
    });
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }
  function navigate(next: number) { setStep(next); contentRef.current?.scrollTo(0, 0); }
  function close() {
    if (busy) return;
    if (dirty && !readOnly && user) {
      try { localStorage.setItem(draftKey(user.uid), JSON.stringify(record)); }
      catch { setStorageError(true); toast.error("O rascunho não pôde ser salvo no aparelho. Salve no Firebase antes de sair."); return; }
    }
    if (dirty && !readOnly && !window.confirm("Fechar o formulário? As respostas ficam como rascunho neste aparelho. Fotos ainda não enviadas precisarão ser selecionadas novamente.")) return;
    onClose();
  }
  function locate() {
    if (!navigator.geolocation) { toast.error("GPS indisponível neste navegador."); return; }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition((position) => {
      setGpsBusy(false);
      if (window.confirm(`Usar a posição atual? Precisão aproximada: ${Math.round(position.coords.accuracy)} m. Isso altera somente as coordenadas deste diagnóstico.`)) {
        setRecord((r) => ({ ...r, answers: { ...r.answers, latitude: position.coords.latitude, longitude: position.coords.longitude } }));
      }
    }, () => { setGpsBusy(false); toast.error("Não foi possível obter a localização. Preencha as coordenadas manualmente."); }, { enableHighAccuracy: true, timeout: 15000 });
  }
  async function save(complete: boolean) {
    let next = { ...record, state: complete ? "concluido" as const : record.state === "importado" ? "importado" as const : "rascunho" as const };
    const problems = diagnosticErrors(next, complete, initial);
    setErrors(problems);
    if (Object.keys(problems).length) {
      const first = FIELDS.find((f) => problems[f.key]);
      navigate(first?.step ?? (problems.period ? 0 : 5));
      toast.error("Revise os campos indicados antes de salvar."); return;
    }
    setBusy(true);
    try {
      for (const item of pending) {
        const file = await compressImageFileIfNeeded(item.file);
        const key = `diagnosticos/${record.id}/${item.id}.${extensionForMime(file.type)}`;
        const url = await uploadFileToPath(key, file);
        const photos = [...next.photos, { id: item.id, key, url, caption: "" }];
        next = { ...next, photos };
        setRecord((r) => ({ ...r, photos }));
        setPending((items) => items.filter((p) => p.id !== item.id));
        URL.revokeObjectURL(item.preview);
      }
      await saveDiagnostic(next, profile?.nome?.trim() || user?.email || "Agente");
      try { if (user) localStorage.removeItem(draftKey(user.uid)); } catch { /* Cloud save already succeeded. */ }
      const removed = initial.photos.filter((p) => !next.photos.some((q) => q.id === p.id));
      if (removed.length) await deleteStoredFilesByPublicUrls(removed.map((p) => p.url)).catch(() => toast.warning("Registro salvo. Algumas fotos removidas ainda permanecem no armazenamento."));
      toast.success(complete ? "Diagnóstico concluído." : "Diagnóstico salvo no Firebase.");
      onSaved(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar. Suas respostas foram mantidas.");
    } finally { setBusy(false); }
  }

  const visibleFields = FIELDS.filter((f) => f.step === step && !(record.kind === "visita" && f.quarterly));
  return <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-6">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">{readOnly ? "Levantamento original" : initial.revision ? "Editar diagnóstico" : "Novo diagnóstico"}</p><h2 className="mt-1 text-xl font-semibold">{record.answers.codigo || "Acompanhamento de ponto"}</h2></div>
      <Button variant="outline" disabled={busy} onClick={close}>Voltar à lista</Button>
    </div>
    <nav aria-label="Etapas do diagnóstico" className="flex gap-2 overflow-x-auto border-b p-4">
      {STEPS.map((title, index) => <button type="button" key={title} onClick={() => navigate(index)} aria-current={step === index ? "step" : undefined} className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium ${step === index ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}>{index + 1}. {title}</button>)}
    </nav>
    <div ref={contentRef} className="p-4 sm:p-6">
      {record.source && <p className="mb-5 break-words rounded-xl bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-200">Origem: {record.source.file} · {record.source.sheet} · linha {record.source.row}. Esta revisão é mantida separada das demais.</p>}
      {record.source && Object.keys(diagnosticErrors(initial)).length > 0 && <p className="mb-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">Esta fonte contém respostas que divergem das alternativas ou regras do modelo. Os valores históricos são preservados ao salvar alterações sem concluir; revise as pendências para concluir o diagnóstico.</p>}
      {!readOnly && <p className="mb-5 text-xs text-zinc-500">As respostas são guardadas como rascunho neste aparelho. Fotos selecionadas são enviadas ao salvar. Este formulário requer conexão para salvar no Firebase.</p>}
      <fieldset disabled={busy} className="space-y-6">
        <legend className="sr-only">{STEPS[step]}</legend>
        {step === 0 && <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="diag-kind" className="mb-1.5 block text-sm font-medium">Tipo de registro</label><select id="diag-kind" className={inputClass} disabled={readOnly || !!record.source || record.sourceId.startsWith("levantamento-")} value={record.kind} onChange={(e) => setRecord((r) => ({ ...r, kind: e.target.value as Diagnostic["kind"] }))}><option value="visita">Visita de campo</option><option value="trimestral">Levantamento trimestral</option></select></div>
          <div><label htmlFor="diag-period" className="mb-1.5 block text-sm font-medium">Competência</label><input id="diag-period" className={inputClass} disabled={readOnly || !!record.source || record.sourceId.startsWith("levantamento-")} placeholder="2026-T3" value={record.period} aria-invalid={!!errors.period} onChange={(e) => setRecord((r) => ({ ...r, period: e.target.value.toUpperCase() }))} />{errors.period && <p className="text-sm text-red-600">{errors.period}</p>}<button className="mt-1 text-xs text-emerald-700 underline disabled:hidden" type="button" disabled={readOnly || !!record.source || record.sourceId.startsWith("levantamento-")} onClick={() => setRecord((r) => ({ ...r, period: periodForDate(String(r.answers.dataChecagem)) }))}>Usar trimestre da checagem</button></div>
        </div>}
        {step === 1 && <div className="space-y-3"><p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">A situação observada hoje é independente da atividade durante o trimestre. Quantidade de limpezas deve vir da operação.</p>
          {record.kind === "visita" && <div><label htmlFor="diag-observed" className="mb-1.5 block text-sm font-medium">Situação encontrada na visita</label><select id="diag-observed" className={inputClass} disabled={readOnly} value={record.observedStatus} onChange={(e) => setRecord((r) => ({ ...r, observedStatus: e.target.value as Diagnostic["observedStatus"] }))}><option value="nao-avaliado">Não foi possível avaliar</option><option value="com-residuos">Com resíduos</option><option value="sem-residuos">Sem resíduos no momento</option></select></div>}
        </div>}
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          {visibleFields.map((field) => <Field key={field.key} field={field} record={record} change={change} error={errors[field.key]} readOnly={readOnly} />)}
        </div>
        {step === 0 && !readOnly && <Button type="button" variant="outline" onClick={locate} disabled={gpsBusy}><MapPin className="mr-2 h-4 w-4" />{gpsBusy ? "Obtendo localização…" : "Usar minha localização"}</Button>}
        {step === 3 && <p className="text-xs text-zinc-500">As origens indicam possibilidades observadas. Não representam identificação comprovada de responsáveis.</p>}
        {step === 5 && <div className="space-y-6">
          <div><label htmlFor="diag-notes" className="mb-1.5 block text-sm font-medium">Observações e justificativas</label><textarea id="diag-notes" className={`${inputClass} min-h-28`} readOnly={readOnly} value={record.notes} onChange={(e) => setRecord((r) => ({ ...r, notes: e.target.value }))} />{errors.notes && <p className="text-red-600">{errors.notes}</p>}</div>
          <div className="grid gap-4 sm:grid-cols-3">
            {record.photos.map((photo) => <div key={photo.id} className="overflow-hidden rounded-xl border p-2">
              {/* Uploaded evidence can use arbitrary configured R2 hosts. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <a href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={photo.caption || "Foto do diagnóstico"} className="h-40 w-full rounded-lg object-cover" /></a>
              {readOnly ? <p className="p-2 text-sm">{photo.caption}</p> : <><input aria-label="Legenda da foto" placeholder="Legenda da foto" className={`${inputClass} mt-2`} value={photo.caption} onChange={(e) => setRecord((r) => ({ ...r, photos: r.photos.map((p) => p.id === photo.id ? { ...p, caption: e.target.value } : p) }))} /><Button variant="ghost" onClick={() => setRecord((r) => ({ ...r, photos: r.photos.filter((p) => p.id !== photo.id) }))}><Trash2 className="mr-2 h-4 w-4" />Remover</Button></>}
            </div>)}
            {pending.map((item) => <div key={item.id} className="rounded-xl border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.preview} alt="Foto aguardando envio" className="h-40 w-full rounded-lg object-cover" /><p className="mt-2 text-xs text-amber-700">Aguardando envio</p><Button variant="ghost" onClick={() => { URL.revokeObjectURL(item.preview); setPending((p) => p.filter((f) => f.id !== item.id)); }}>Remover</Button>
            </div>)}
          </div>
          {!readOnly && <div><label htmlFor="diag-photos" className="mb-2 flex items-center gap-2 text-sm font-medium"><Camera className="h-4 w-4" />Adicionar fotos (até 12, máximo 20 MB cada)</label><input id="diag-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.some((f) => !["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 20 * 1024 * 1024)) { toast.error("Selecione imagens JPEG, PNG ou WebP com até 20 MB."); e.target.value = ""; return; }
            if (files.length + pending.length + record.photos.length > 12) { toast.error("O limite é de 12 fotos por diagnóstico."); e.target.value = ""; return; }
            setPending((p) => [...p, ...files.map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }))]); e.target.value = "";
          }} /></div>}
          <div className="rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-900"><h3 className="font-semibold">Revisão</h3><p className="mt-2">{record.answers.codigo || "Sem código"} · {record.answers.endereco || "Sem endereço"}</p><p>{record.answers.dataChecagem} · {record.period} · {record.kind === "visita" ? "Visita de campo" : "Trimestral"}</p><p className="mt-2 text-zinc-500">{FIELDS.filter((f) => !(record.kind === "visita" && f.quarterly) && record.answers[f.key] !== undefined && record.answers[f.key] !== "").length} respostas preenchidas · {record.photos.length + pending.length} fotos</p><p className="mt-2 text-xs text-zinc-500">Concluir valida os campos do formulário. A aprovação e a entrega oficial do trimestre serão etapas separadas.</p></div>
        </div>}
      </fieldset>
      <datalist id="diagnostic-points">{pointOptions.map((p) => <option key={p.setor} value={p.setor}>{p.address}</option>)}</datalist>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 sm:p-6">
      <div className="flex gap-2"><Button variant="outline" disabled={step === 0 || busy} onClick={() => navigate(step - 1)}><ChevronLeft className="h-4 w-4" />Anterior</Button>{step < 5 && <Button variant="outline" disabled={busy} onClick={() => navigate(step + 1)}>Próxima<ChevronRight className="h-4 w-4" /></Button>}</div>
      {!readOnly && <div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => { try { if (user) localStorage.setItem(draftKey(user.uid), JSON.stringify(record)); setStorageError(false); } catch { setStorageError(true); } void save(false); }}><Save className="mr-2 h-4 w-4" />Salvar rascunho</Button><Button disabled={busy} className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => void save(true)}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Concluir</Button></div>}
    </div>
    {storageError && <p role="alert" className="p-4 text-sm text-red-600">Não foi possível guardar o rascunho no aparelho. Mantenha a página aberta até confirmar o envio.</p>}
  </section>;
}
