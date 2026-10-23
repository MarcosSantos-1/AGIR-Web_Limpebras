"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, CloudUpload, ImagePlus, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useUserProfile } from "@/contexts/user-profile-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FIELDS, STEPS, diagnosticErrors, fieldVersion, type Diagnostic } from "@/lib/diagnosticos";
import { saveDiagnostic } from "@/lib/firestore/diagnosticos";
import { compressImageFileIfNeeded } from "@/lib/image-compress";
import { extensionForMime, uploadFileToPath } from "@/lib/storage/upload-helpers";
import { deleteStoredFilesByPublicUrls } from "@/lib/storage/delete-stored-files";
import { readDraftPhotos, writeDraftPhotos, type PendingDiagnosticPhoto } from "@/lib/diagnostic-draft-photos";

function PhotoPreview({ file }: { file: File }) {
  const [url] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Foto aguardando envio" className="h-24 w-full rounded-xl object-cover" />;
}

export function SurveyOnboarding({ initial, onClose, onSaved }: { initial: Diagnostic; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth(); const { profile } = useUserProfile();
  const key = `agir:campo:${user?.uid}:${initial.id}`;
  const [record, setRecord] = useState<Diagnostic>(() => {
    try { const raw = localStorage.getItem(key); const saved = raw ? JSON.parse(raw) as Diagnostic : null; return saved?.revision === initial.revision && saved.id === initial.id ? saved : initial; } catch { return initial; }
  });
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState<PendingDiagnosticPhoto[]>([]);
  const [photosReady, setPhotosReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [localError, setLocalError] = useState("");
  const [optionSearch, setOptionSearch] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null); const galleryRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inactive = String(record.answers.statusTrimestral ?? "").includes("inativo");
  const fields = FIELDS.filter((f) => (f.key !== "outroLogradouro" || record.answers.tipoLogradouro === "Outros.") && !(inactive && f.step >= 3)).sort((a, b) => a.step - b.step);
  const field = fields[index]; const review = index >= fields.length;
  const currentValue = field ? record.answers[field.key] ?? "" : "";

  useEffect(() => { let active = true; readDraftPhotos(key).then((items) => { if (active) { setPending(items); setPhotosReady(true); } }).catch(() => { if (active) { setPhotosReady(true); setLocalError("Não foi possível recuperar fotos locais. As respostas continuam disponíveis."); } }); return () => { active = false; }; }, [key]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(record)); }
      catch { setLocalError("Armazenamento do aparelho indisponível. Salve no servidor antes de sair."); }
      if (photosReady) writeDraftPhotos(key, pending).catch(() => setLocalError("Não foi possível guardar as fotos no aparelho. Mantenha esta tela aberta até enviar."));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [key, record, pending, photosReady]);
  useEffect(() => { const handler = (event: BeforeUnloadEvent) => { if (!busy) { try { localStorage.setItem(key, JSON.stringify(record)); } catch { /* warning already visible */ } } event.preventDefault(); }; window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler); }, [key, record, busy]);

  function change(value: string | number) {
    if (!field) return;
    setRecord((r) => {
      const answers = { ...r.answers, [field.key]: value };
      if (field.key === "statusTrimestral" && String(value).includes("inativo")) {
        answers.limpezas = 0;
        for (const f of FIELDS.filter((f) => f.key === "revitalizacao" || f.key === "coleta" || f.step >= 3)) {
          const notApplicable = fieldVersion(f, r.questionnaireVersion).options.find((option) => option.startsWith("Não se aplica"));
          if (notApplicable) answers[f.key] = notApplicable;
        }
      }
      return { ...r, answers, pointId: String(answers.codigo) };
    }); setError("");
  }
  function go(next: number) { setIndex(next); setError(""); setOptionSearch(""); scrollRef.current?.scrollTo({ top: 0 }); }
  async function exit() {
    try { localStorage.setItem(key, JSON.stringify(record)); await writeDraftPhotos(key, pending); toast.info("Rascunho mantido neste aparelho."); onClose(); }
    catch { setLocalError("Não foi possível guardar o rascunho. Salve no servidor antes de sair."); }
  }
  async function addPhotos(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files);
    if (list.length + pending.length + record.photos.length > 12 || list.some((f) => !["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 20 * 1024 * 1024)) { toast.error("Até 12 fotos JPEG, PNG ou WebP, com no máximo 20 MB cada."); return; }
    setBusy(true);
    try { const next = await Promise.all(list.map(async (file) => ({ id: crypto.randomUUID(), file: await compressImageFileIfNeeded(file) }))); setPending((p) => [...p, ...next]); }
    finally { setBusy(false); }
  }
  async function save(complete: boolean) {
    const answers = { ...record.answers };
    for (const field of FIELDS.filter(f => f.type === "number")) { const value = answers[field.key]; if (value !== undefined && value !== "" && Number.isFinite(Number(String(value).replace(",", ".")))) answers[field.key] = Number(String(value).replace(",", ".")); }
    let next = { ...record, answers, state: complete ? "concluido" as const : "rascunho" as const };
    const problems = diagnosticErrors(next, complete, initial);
    const first = fields.findIndex((f) => problems[f.key]);
    if (Object.keys(problems).length) { if (first >= 0) go(first); setError(Object.values(problems)[0]); return; }
    setBusy(true); setError("");
    try {
      for (const photo of pending) {
        const path = `diagnosticos/${record.id}/${photo.id}.${extensionForMime(photo.file.type)}`;
        const url = await uploadFileToPath(path, photo.file);
        const photos = [...next.photos, { id: photo.id, key: path, url, caption: photo.caption ?? "" }];
        next = { ...next, photos }; setRecord((r) => ({ ...r, photos })); setPending((p) => p.filter((f) => f.id !== photo.id));
      }
      await saveDiagnostic(next, profile?.nome || user?.email || "Agente");
      const removed = initial.photos.filter((photo) => !next.photos.some((p) => p.id === photo.id));
      if (removed.length) await deleteStoredFilesByPublicUrls(removed.map((photo) => photo.url)).catch(() => toast.warning("Registro salvo. Algumas fotos removidas ainda aguardam limpeza no armazenamento."));
      try { localStorage.removeItem(key); await writeDraftPhotos(key, []); } catch { /* server save succeeded */ }
      toast.success(complete ? "Ponto concluído! O mapa foi atualizado." : "Rascunho enviado ao servidor."); onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha no envio. Suas respostas foram mantidas."); }
    finally { setBusy(false); }
  }
  const groupFields = field ? fields.filter((f) => f.step === field.step) : [];
  const subIndex = field ? groupFields.findIndex((f) => f.key === field.key) + 1 : 0;
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) void exit(); }}><DialogContent showCloseButton={false} className="inset-0 left-0 top-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 sm:max-w-none">
    <header className="flex items-center gap-3 border-b bg-white px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] dark:bg-zinc-950"><button disabled={busy} onClick={() => { if (index > 0) go(index - 1); else void exit(); }} aria-label="Voltar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900"><ArrowLeft className="h-5 w-5" /></button><div className="min-w-0 flex-1"><DialogTitle className="text-base">{record.pointId}</DialogTitle><DialogDescription className="truncate text-xs">{String(record.answers.endereco)}</DialogDescription></div><span className="text-xs font-semibold text-emerald-600">{Math.round(index / fields.length * 100)}%</span><button disabled={busy} aria-label="Voltar ao mapa mantendo o rascunho" onClick={() => void exit()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900"><X className="h-4 w-4" /></button></header>
    <div className="h-1 bg-emerald-50"><div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${index / fields.length * 100}%` }} /></div>
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-zinc-50 px-5 py-6 dark:bg-zinc-950"><div className="mx-auto max-w-xl">
      {localError && <p role="alert" className="mb-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{localError}</p>}
      {inactive && <p className="mb-4 rounded-2xl bg-zinc-200/70 p-3 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Ponto inativo no trimestre: as questões de descarte recebem “Não se aplica”, conforme as alternativas do modelo. A identificação e as características do local continuam obrigatórias.</p>}
      {field ? <>
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">{STEPS[field.step]} · {subIndex} de {groupFields.length}</p><h2 className="mt-3 text-2xl font-semibold leading-tight">{field.label}</h2>
        <p className="mt-2 text-sm text-zinc-500">{field.key === "statusTrimestral" ? "Considere todo o trimestre. Um ponto limpo hoje pode ter recebido descarte antes." : field.step === 3 ? "Responda com base nas evidências observadas no local." : "Confirme a informação antes de continuar."}</p>
        <div className="mt-6 space-y-3">
          {field.type === "select" ? <>{fieldVersion(field, record.questionnaireVersion).options.length > 6 && <input aria-label="Buscar alternativa" className="h-12 w-full rounded-2xl border bg-white px-4 dark:bg-zinc-900" placeholder="Buscar alternativa" value={optionSearch} onChange={(e) => setOptionSearch(e.target.value)} />}{fieldVersion(field, record.questionnaireVersion).options.filter((o) => o.toLowerCase().includes(optionSearch.toLowerCase())).map((option) => <button key={option} disabled={busy} aria-pressed={currentValue === option} onClick={() => change(option)} className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left text-sm font-medium transition active:scale-[0.99] ${currentValue === option ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}><span>{option}</span><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${currentValue === option ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-300"}`}>{currentValue === option && <Check className="h-4 w-4" />}</span></button>)}</> : <div className="rounded-2xl border bg-white p-4 dark:bg-zinc-900"><label htmlFor="campo-value" className="sr-only">{field.label}</label><input id="campo-value" disabled={busy} inputMode={field.type === "number" ? "decimal" : "text"} className="h-14 w-full bg-transparent text-xl outline-none" placeholder={field.type === "date" ? "DD/MM/AAAA" : "Digite sua resposta"} value={field.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(String(currentValue)) ? String(currentValue).split("-").reverse().join("/") : currentValue} onChange={(e) => { const value = e.target.value; if (field.type === "date" && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) change(value.split("/").reverse().join("-")); else change(field.type === "number" ? value.replace(",", ".") : value); }} /></div>}
        </div><details className="mt-5 text-xs text-zinc-500"><summary className="cursor-pointer">Ajuda para esta pergunta</summary><p className="whitespace-pre-line py-3">{fieldVersion(field, record.questionnaireVersion).instruction}</p></details>
      </> : <>
        <div className="mb-4 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700"><CheckCircle2 className="h-7 w-7" /></div><h2 className="text-2xl font-semibold">Fotos e revisão</h2><p className="mt-2 text-sm text-zinc-500">Confira as respostas, registre as evidências e conclua o ponto.</p>
        <div className="mt-5 flex gap-3"><Button variant="outline" disabled={busy} onClick={() => cameraRef.current?.click()}><Camera className="mr-2 h-4 w-4" />Câmera</Button><Button variant="outline" disabled={busy} onClick={() => galleryRef.current?.click()}><ImagePlus className="mr-2 h-4 w-4" />Galeria</Button></div>
        <input ref={cameraRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} /><input ref={galleryRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} />
        <div className="mt-4 grid grid-cols-3 gap-2">{pending.map((p) => <div key={p.id} className="relative"><PhotoPreview file={p.file} /><button disabled={busy} aria-label="Remover foto pendente" onClick={() => setPending((items) => items.filter((f) => f.id !== p.id))} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"><X className="h-3.5 w-3.5" /></button><span className="text-[10px] text-amber-700">Aguardando envio</span></div>)}{record.photos.map((p) => <div key={p.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt={p.caption || "Evidência do ponto"} className="h-24 w-full rounded-xl object-cover" /><input aria-label="Legenda da foto" className="mt-1 w-full rounded-lg border bg-transparent p-1 text-xs" placeholder="Legenda" value={p.caption} onChange={(e) => setRecord((r) => ({ ...r, photos: r.photos.map((photo) => photo.id === p.id ? { ...photo, caption: e.target.value } : photo) }))} />
        </div>)}</div>
        <label htmlFor="campo-notes" className="mb-2 mt-5 block text-sm font-medium">Observações</label><textarea id="campo-notes" disabled={busy} className="min-h-28 w-full rounded-2xl border bg-white p-4 text-sm dark:bg-zinc-900" value={record.notes} onChange={(e) => setRecord((r) => ({ ...r, notes: e.target.value }))} />
        {STEPS.slice(0, 5).map((title, step) => <details key={title} className="mt-3 rounded-2xl border bg-white p-4 dark:bg-zinc-900"><summary className="text-sm font-medium">{title}</summary><div className="mt-3 space-y-3">{fields.filter((f) => f.step === step).map((f) => <button className="block w-full text-left" key={f.key} onClick={() => go(fields.findIndex((item) => item.key === f.key))}><span className="block text-xs text-zinc-400">{f.label}</span><span className="text-sm">{record.answers[f.key] ?? "Pendente"}</span></button>)}</div></details>)}
      </>}
      {error && <p role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    </div></div>
    <footer className="border-t bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 dark:bg-zinc-950"><div className="mx-auto flex max-w-xl gap-3"><Button variant="outline" className="h-12 rounded-2xl" disabled={busy || !photosReady} onClick={() => void save(false)}><Save className="mr-2 h-4 w-4" />Rascunho</Button><Button className="h-12 flex-1 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700" disabled={busy || !photosReady} onClick={() => { if (review) { void save(true); return; } const problem = diagnosticErrors(record, true, initial)[field.key]; if (problem) { setError(problem); return; } go(index + 1); }}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : review ? <CloudUpload className="mr-2 h-4 w-4" /> : null}{review ? "Concluir ponto" : "Continuar"}{!review && <ArrowRight className="ml-2 h-4 w-4" />}</Button></div></footer>
  </DialogContent></Dialog>;
}
