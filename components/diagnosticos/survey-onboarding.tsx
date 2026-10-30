"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Armchair, ArrowLeft, ArrowRight, Bike, Bird, Bug, Camera, Check, CloudFog, CloudUpload, Construction, Droplets, Factory, Flame, Footprints, HardHat, House, ImagePlus, Loader2, MapPin, Mountain, Rat, Recycle, Save, ShieldAlert, Signpost, Tent, Trash2, Truck, Users, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import catalog from "@/data/features-PV.json";
import { PontoFichaFields } from "@/components/pontos/ponto-ficha-fields";
import { useAgendaEvents } from "@/contexts/agenda-events-context";
import { useAuth } from "@/contexts/auth-context";
import { useUserProfile } from "@/contexts/user-profile-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { isSubregionalId, subregionalIdFromSubprefeitura, subregionalMeta } from "@/lib/constants/subregionais";
import { diagnosticErrors, localToday, type Diagnostic } from "@/lib/diagnosticos";
import { saveDiagnostic } from "@/lib/firestore/diagnosticos";
import { savePontoFicha } from "@/lib/firestore/ponto-fichas";
import { OPERACAO_LEVANTAMENTO_NOTA, surveyOpenDate, type Levantamento } from "@/lib/levantamentos";
import { fichaDraftFromAnswers, fichaErrors, fichaLockedKeys, isOutrosLogradouro } from "@/lib/ponto-ficha";
import { compressImageFileIfNeeded } from "@/lib/image-compress";
import { extensionForMime, uploadFileToPath } from "@/lib/storage/upload-helpers";
import { deleteStoredFilesByPublicUrls } from "@/lib/storage/delete-stored-files";
import { readDraftPhotos, writeDraftPhotos, type PendingDiagnosticPhoto } from "@/lib/diagnostic-draft-photos";
import { CONDICOES, ORIGENS, PROXIMIDADES, RESIDUOS, activityChoices, applyQuarterlyAutomation, impactChoices, isMarked, materializeVistoria, pointIsInactive, volumeChoices, withAutomaticContext, type VistoriaCheck, type VistoriaChoice } from "@/lib/vistoria-form";

const PointMiniMap = dynamic(() => import("./point-minimap"), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-2xl bg-emerald-100/80 dark:bg-emerald-950" />,
});

const ICONS: Record<string, LucideIcon> = {
  residuoDomiciliar: House,
  residuoEntulho: Construction,
  residuoMoveis: Armchair,
  origemResidentes: Users,
  origemPequenosTransportadores: Bike,
  origemCacambeiros: HardHat,
  origemGrandesTransportadores: Truck,
  origemGrandesGeradores: Factory,
  riscoAves: Bird,
  riscoInsetos: Bug,
  riscoPeconhentos: ShieldAlert,
  riscoRoedores: Rat,
  riscoAgua: Droplets,
  riscoOdor: CloudFog,
  riscoQueimada: Flame,
  vistoriaErosao: Mountain,
  vistoriaDanosVia: Construction,
  proximidadeConteiner: Trash2,
  proximidadePlaca: Signpost,
  proximidadeCatadores: Recycle,
  proximidadeCirculacaoRua: Footprints,
  proximidadeFixacaoRua: Tent,
};

const STEPS: { id: "identificacao" | "ficha" | "residuos" | "origens" | "condicoes" | "impactos" | "proximidades" | "revisao"; title: string; help: string }[] = [
  { id: "identificacao", title: "Identificação do ponto", help: "O endereço, as coordenadas e a sub-regional já ficam salvos. A data da checagem é o dia em que você conclui este formulário, com a foto." },
  { id: "ficha", title: "Ficha do ponto", help: "Estes dados acompanham o ponto em todo levantamento. O que já veio da planilha fica só para leitura. Complete o que estiver vazio para concluir." },
  { id: "residuos", title: "1. Tipos de resíduos sólidos presentes", help: "Marque só o que encontrou. Se não houver nenhum destes, pode seguir sem marcar." },
  { id: "origens", title: "2. Possível origem do descarte", help: "Uma leitura do que parece ter gerado o material. Não precisa ter certeza absoluta." },
  { id: "condicoes", title: "3. Condições observadas no ponto", help: "Olhe o ponto e o chão ao redor. Marque o que estiver presente. A caçamba da Loga também: marcado é sim, sem marcar é não." },
  { id: "impactos", title: "4. Impactos na circulação", help: "Para cada item, escolha uma opção. Assim a gente entende se o descarte atrapalha quem passa." },
  { id: "proximidades", title: "5. Características nas proximidades (perímetro de até 15 m)", help: "Um raio curto, de até 15 metros. Marque o que existe por perto." },
  { id: "revisao", title: "Observações complementares", help: "Se quiser, deixe um recado com suas palavras. No fim, confirme que a vistoria é sua." },
];

const POINTS = catalog.features as { setor: string; address?: string; subprefeitura?: string; centroid?: number[] }[];

function PhotoPreview({ file }: { file: File }) {
  const [url] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Foto do ponto aguardando envio" className="h-36 w-full rounded-2xl object-cover" />;
}

function formatDate(value: unknown) {
  const date = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split("-").reverse().join("/") : "hoje";
}

function formatCoord(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(5) : "";
}

function regionalLabel(record: Diagnostic) {
  const stored = record.answers.subregional;
  const id = isSubregionalId(stored) ? stored : subregionalIdFromSubprefeitura(String(record.answers.subprefeitura ?? ""));
  if (id) return subregionalMeta(id).label;
  return String(record.answers.subprefeitura ?? "").trim();
}

function hasCoordinates(record: Diagnostic) {
  const lat = Number(record.answers.latitude);
  const lng = Number(record.answers.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && record.answers.latitude !== "" && record.answers.longitude !== "";
}

function CheckCard({ item, pressed, disabled, onClick }: { item: VistoriaCheck; pressed: boolean; disabled: boolean; onClick: () => void }) {
  const Icon = ICONS[item.key] ?? MapPin;
  return (
    <button type="button" disabled={disabled} aria-pressed={pressed} onClick={onClick} className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left transition active:scale-[0.99] ${pressed ? "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${pressed ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"}`}><Icon className="h-5 w-5" /></span>
      <span className="flex-1 text-sm font-medium leading-snug">{item.label}</span>
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${pressed ? "border-emerald-600 bg-emerald-600 text-white" : "border-zinc-300 bg-white dark:bg-zinc-950"}`}>{pressed && <Check className="h-4 w-4" />}</span>
    </button>
  );
}

function ChoiceButton({ choice, letter, pressed, disabled, onClick }: { choice: VistoriaChoice; letter: string; pressed: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} aria-pressed={pressed} onClick={onClick} className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left text-sm font-medium transition active:scale-[0.99] ${pressed ? "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${pressed ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"}`}>{letter}</span>
      <span>{choice.label}</span>
    </button>
  );
}

export function SurveyOnboarding({ initial, onClose, onSaved, presentation = "screen", draftScope = "point", survey = null }: {
  initial: Diagnostic;
  onClose: () => void;
  onSaved: (record: Diagnostic) => void;
  presentation?: "screen" | "dialog" | "page";
  draftScope?: "point" | "account";
  survey?: Pick<Levantamento, "period" | "openedAtMs"> | null;
}) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { events } = useAgendaEvents();
  const storageKey = draftScope === "account" ? `agir:diagnosticos:draft:${user?.uid}` : `agir:campo:${user?.uid}:${initial.id}`;
  const responsible = profile?.nome?.trim() || user?.email || "Agente de campo";
  const [record, setRecord] = useState<Diagnostic>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const saved = raw ? JSON.parse(raw) as Diagnostic : null;
      const base = saved?.revision === initial.revision && saved.id === initial.id ? saved : initial;
      return withAutomaticContext(base);
    } catch { return withAutomaticContext(initial); }
  });
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState<PendingDiagnosticPhoto[]>([]);
  const [photosReady, setPhotosReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [error, setError] = useState("");
  const [localError, setLocalError] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inactive = pointIsInactive(record);
  const photoCount = pending.length + record.photos.length;
  const steps = record.kind === "trimestral" ? STEPS : STEPS.filter((item) => item.id !== "ficha");
  const step = steps[index] ?? steps[0];
  const lockedFicha = useMemo(() => fichaLockedKeys(fichaDraftFromAnswers(initial.answers), initial.questionnaireVersion), [initial]);
  const automation = useMemo(() => ({
    openDate: surveyOpenDate({ period: survey?.period || record.period, openedAtMs: survey?.openedAtMs }),
    events: events.map((event) => ({ type: event.type, status: event.status, date: event.date, title: event.title, observations: event.observations })),
  }), [events, record.period, survey?.openedAtMs, survey?.period]);

  useEffect(() => {
    let active = true;
    readDraftPhotos(storageKey).then((items) => { if (active) { setPending(items); setPhotosReady(true); } }).catch(() => { if (active) { setPhotosReady(true); setLocalError("Não foi possível recuperar fotos locais. As respostas continuam disponíveis."); } });
    return () => { active = false; };
  }, [storageKey]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify(record)); }
      catch { setLocalError("Armazenamento do aparelho indisponível. Salve no servidor antes de sair."); }
      if (photosReady) writeDraftPhotos(storageKey, pending).catch(() => setLocalError("Não foi possível guardar as fotos no aparelho. Mantenha esta tela aberta até enviar."));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [storageKey, record, pending, photosReady]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (!busy) { try { localStorage.setItem(storageKey, JSON.stringify(record)); } catch { /* aviso já visível */ } } event.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [storageKey, record, busy]);

  function go(next: number) { setIndex(next); setError(""); scrollRef.current?.scrollTo({ top: 0 }); }
  function toggle(key: string) {
    setRecord((current) => ({ ...current, answers: { ...current.answers, [key]: isMarked(current.answers[key]) ? "" : "Sim." } }));
    setError("");
  }
  function setActive(value: string) {
    setRecord((current) => {
      const turningOff = value.toLowerCase().includes("inativo");
      const volume = turningOff ? "" : String(current.answers.volume ?? "").startsWith("Não se aplica") ? "" : current.answers.volume;
      return { ...current, observedStatus: turningOff ? "sem-residuos" : "com-residuos", answers: { ...current.answers, statusTrimestral: value, volume: volume ?? "", ...(turningOff ? { limpezas: 0 } : {}) } };
    });
    setError("");
  }
  function setCode(raw: string) {
    const codigo = raw.trim().toUpperCase();
    setRecord((current) => {
      const found = POINTS.find((point) => point.setor.toUpperCase() === codigo);
      const answers: Diagnostic["answers"] = { ...current.answers, codigo };
      if (found) Object.assign(answers, { endereco: found.address || answers.endereco, subprefeitura: found.subprefeitura ?? answers.subprefeitura ?? "", latitude: found.centroid?.[0] ?? answers.latitude, longitude: found.centroid?.[1] ?? answers.longitude, sigla: found.setor.split("-")[0] });
      return withAutomaticContext({ ...current, answers, pointId: codigo });
    });
    setError("");
  }
  function locate() {
    if (!navigator.geolocation) { setError("Este aparelho não ofereceu localização. Abra o ponto pelo mapa, que já traz as coordenadas."); return; }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition((position) => {
      setGpsBusy(false);
      setRecord((current) => ({ ...current, answers: { ...current.answers, latitude: position.coords.latitude, longitude: position.coords.longitude } }));
      setError("");
    }, () => { setGpsBusy(false); setError("Não consegui a posição. Libere o GPS e tente de novo."); }, { enableHighAccuracy: true, timeout: 15000 });
  }
  async function exit() {
    try { localStorage.setItem(storageKey, JSON.stringify(record)); await writeDraftPhotos(storageKey, pending); toast.info("Rascunho mantido neste aparelho."); onClose(); }
    catch { setLocalError("Não foi possível guardar o rascunho. Salve no servidor antes de sair."); }
  }
  async function addPhotos(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files);
    if (list.length + pending.length + record.photos.length > 12 || list.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 20 * 1024 * 1024)) { toast.error("Até 12 fotos JPEG, PNG ou WebP, com no máximo 20 MB cada."); return; }
    setBusy(true);
    try { const next = await Promise.all(list.map(async (file) => ({ id: crypto.randomUUID(), file: await compressImageFileIfNeeded(file) }))); setPending((items) => [...items, ...next]); setError(""); }
    finally { setBusy(false); }
  }
  function stepIssue(at: number) {
    const id = steps[at]?.id;
    if (id === "identificacao") {
      if (!/^[A-Z]{1,3}-\d+$/.test(String(record.answers.codigo ?? ""))) return "Informe o código do ponto, como CV-001.";
      if (!String(record.answers.endereco ?? "").trim()) return "Falta o endereço deste ponto.";
      if (!hasCoordinates(record)) return "Ainda não tenho as coordenadas. Toque em registrar minha posição.";
      if (photoCount < 1) return "Tire a foto de hoje do ponto para continuar. Pode ser pela câmera.";
      if (!String(record.answers.statusTrimestral ?? "").trim()) return "Me conta se o ponto está ativo.";
      if (!inactive && !volumeChoices(record.questionnaireVersion).some((choice) => choice.value === record.answers.volume)) return "Escolha a volumetria que você está vendo.";
    }
    if (id === "ficha") return Object.values(fichaErrors(fichaDraftFromAnswers(record.answers), record.questionnaireVersion))[0] ?? "";
    if (id === "impactos" && (!record.answers.impactoPedestres || !record.answers.impactoVeiculos)) return "Escolha uma opção para pedestres e outra para veículos.";
    if (id === "revisao" && record.answers.termoVistoria !== "sim") return "Falta só confirmar que a vistoria é sua.";
    return "";
  }
  function stepForError(key: string) {
    let id: (typeof STEPS)[number]["id"] = "revisao";
    if (["codigo", "endereco", "latitude", "longitude", "dataChecagem", "statusTrimestral", "volume"].includes(key)) id = "identificacao";
    else if (["complemento", "tipoLogradouro", "outroLogradouro", "topografia", "ocupacao"].includes(key) || key.startsWith("entorno")) id = "ficha";
    else if (RESIDUOS.some((item) => item.key === key)) id = "residuos";
    else if (ORIGENS.some((item) => item.key === key)) id = "origens";
    else if (key === "proximidadeConteiner" || key.startsWith("risco") || key.startsWith("vistoria")) id = "condicoes";
    else if (key.startsWith("impacto")) id = "impactos";
    else if (key.startsWith("proximidade")) id = "proximidades";
    const found = steps.findIndex((item) => item.id === id);
    return found >= 0 ? found : 0;
  }
  async function save(complete: boolean) {
    if (complete) {
      for (let at = 0; at < steps.length; at += 1) {
        const problem = stepIssue(at);
        if (problem) { go(at); setError(problem); return; }
      }
    }
    const state = complete ? "concluido" as const : record.state === "importado" ? "importado" as const : "rascunho" as const;
    const answers = complete ? { ...record.answers, dataChecagem: localToday() } : record.answers;
    const prepared = { ...record, answers, state, responsibleName: responsible };
    let next = complete ? materializeVistoria(prepared, automation) : applyQuarterlyAutomation(withAutomaticContext(prepared), automation);
    next = { ...next, answers: { ...next.answers, termoVistoria: record.answers.termoVistoria === "sim" ? "sim" : "" } };
    const problems = diagnosticErrors(next, complete, initial.source ? initial : undefined);
    if (Object.keys(problems).length) { go(stepForError(Object.keys(problems)[0])); setError(Object.values(problems)[0]); return; }
    setBusy(true); setError("");
    try {
      for (const photo of pending) {
        const path = `diagnosticos/${record.id}/${photo.id}.${extensionForMime(photo.file.type)}`;
        const url = await uploadFileToPath(path, photo.file);
        next = { ...next, photos: [...next.photos, { id: photo.id, key: path, url, caption: photo.caption ?? "" }] };
        setRecord((current) => ({ ...current, photos: next.photos }));
        setPending((items) => items.filter((item) => item.id !== photo.id));
      }
      if (complete && next.kind === "trimestral") await savePontoFicha(String(next.answers.codigo ?? next.pointId), fichaDraftFromAnswers(next.answers));
      await saveDiagnostic(next, responsible);
      const removed = initial.photos.filter((photo) => !next.photos.some((item) => item.id === photo.id));
      if (removed.length) await deleteStoredFilesByPublicUrls(removed.map((photo) => photo.url)).catch(() => toast.warning("Registro salvo. Algumas fotos removidas ainda aguardam limpeza no armazenamento."));
      try { localStorage.removeItem(storageKey); await writeDraftPhotos(storageKey, []); } catch { /* o servidor já guardou */ }
      toast.success(complete ? "Vistoria concluída. O mapa foi atualizado." : "Rascunho enviado ao servidor.");
      onSaved(next);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha no envio. Suas respostas foram mantidas."); }
    finally { setBusy(false); }
  }

  const identityFromPoint = /^[A-Z]{1,3}-\d+$/.test(String(initial.pointId || initial.answers.codigo || ""));
  const addressFromPoint = String(initial.answers.endereco ?? "").trim().length > 0;
  const coordsFromPoint = hasCoordinates(initial);
  const regional = regionalLabel(record);
  const coords = hasCoordinates(record) ? `${formatCoord(record.answers.latitude)}, ${formatCoord(record.answers.longitude)}` : "";
  const activities = activityChoices(record.questionnaireVersion);
  const volumes = volumeChoices(record.questionnaireVersion);
  const pedestrians = impactChoices("impactoPedestres", record.questionnaireVersion);
  const vehicles = impactChoices("impactoVeiculos", record.questionnaireVersion);
  const letters = ["A", "B", "C", "D"];

  const body = (
    <>
      <header className="flex items-center gap-3 border-b bg-white px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] dark:bg-zinc-950 sm:pt-4">
        <button type="button" disabled={busy} onClick={() => { if (index > 0) go(index - 1); else void exit(); }} aria-label="Voltar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1">
          {presentation === "page" ? <h1 className="truncate text-base font-semibold">{record.pointId || "Nova vistoria"}</h1> : <DialogTitle className="truncate text-base">{record.pointId || "Nova vistoria"}</DialogTitle>}
          {presentation !== "page" && <DialogDescription className="truncate text-xs">{String(record.answers.endereco || "Vamos registrar este ponto juntos")}</DialogDescription>}
          {presentation === "page" && <p className="truncate text-xs text-zinc-500">{String(record.answers.endereco || "Vamos registrar este ponto juntos")}</p>}
        </div>
        <span className="text-xs font-semibold text-emerald-700">{index + 1}/{steps.length}</span>
        <button type="button" disabled={busy} aria-label="Fechar e manter o rascunho" onClick={() => void exit()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900"><X className="h-4 w-4" /></button>
      </header>
      <div className="h-1 bg-emerald-50 dark:bg-emerald-950"><div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${((index + 1) / steps.length) * 100}%` }} /></div>
      <div ref={scrollRef} className={presentation === "page" ? "bg-zinc-50 px-4 py-6 dark:bg-zinc-950 sm:px-8" : "min-h-0 flex-1 overflow-y-auto overscroll-contain bg-zinc-50 px-4 py-6 dark:bg-zinc-950 sm:px-8"}>
        <div className="mx-auto max-w-3xl">
          {localError && <p role="alert" className="mb-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{localError}</p>}
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Passo {index + 1} de {steps.length}</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-zinc-900 dark:text-zinc-50">{step.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{step.help}</p>

          {step.id === "identificacao" && <div className="mt-6 space-y-5">
            <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm dark:border-emerald-900 dark:bg-zinc-900">
              {hasCoordinates(record) ? <PointMiniMap lat={Number(record.answers.latitude)} lng={Number(record.answers.longitude)} /> : <div className="flex h-48 flex-col items-center justify-center gap-3 bg-emerald-50 px-6 text-center dark:bg-emerald-950"><MapPin className="h-8 w-8 text-emerald-700" /><p className="text-sm text-emerald-900 dark:text-emerald-100">O mapa aparece quando a posição do ponto estiver salva.</p><Button type="button" variant="outline" disabled={gpsBusy || busy} onClick={locate}>{gpsBusy ? "Buscando sua posição…" : "Registrar minha posição"}</Button></div>}
              <div className="space-y-3 p-4">
                {identityFromPoint ? <p className="text-lg font-semibold">{record.answers.codigo}</p> : <div><label htmlFor="vistoria-codigo" className="mb-1.5 block text-sm font-medium">Código do ponto</label><input id="vistoria-codigo" list="vistoria-pontos" className="h-12 w-full rounded-2xl border bg-white px-4 dark:bg-zinc-950" placeholder="CV-001" value={String(record.answers.codigo ?? "")} onChange={(event) => setCode(event.target.value)} /><datalist id="vistoria-pontos">{POINTS.map((point) => <option key={point.setor} value={point.setor}>{point.address}</option>)}</datalist></div>}
                {addressFromPoint ? <p className="text-sm text-zinc-600 dark:text-zinc-300">{record.answers.endereco}</p> : <div><label htmlFor="vistoria-endereco" className="mb-1.5 block text-sm font-medium">Endereço</label><input id="vistoria-endereco" className="h-12 w-full rounded-2xl border bg-white px-4 dark:bg-zinc-950" placeholder="Rua, número" value={String(record.answers.endereco ?? "")} onChange={(event) => setRecord((current) => ({ ...current, answers: { ...current.answers, endereco: event.target.value } }))} /></div>}
                {!coordsFromPoint && hasCoordinates(record) && <button type="button" className="text-xs font-medium text-emerald-700 underline" disabled={gpsBusy || busy} onClick={locate}>{gpsBusy ? "Buscando sua posição…" : "Atualizar com a minha posição"}</button>}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">Data da checagem {formatDate(localToday())}</span>
                  {regional && <span className="rounded-full bg-zinc-100 px-3 py-1.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">Sub-regional {regional}</span>}
                  {String(record.answers.distrito ?? "").trim() && <span className="rounded-full bg-zinc-100 px-3 py-1.5 font-medium text-zinc-700 dark:bg-zinc-800">Distrito {record.answers.distrito}</span>}
                  {coords && <span className="rounded-full bg-zinc-100 px-3 py-1.5 font-medium text-zinc-700 dark:bg-zinc-800">Coordenadas {coords}</span>}
                </div>
              </div>
            </div>

            <section className="rounded-3xl border border-dashed border-emerald-300 bg-white p-4 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-base font-semibold">Foto atual do ponto <span className="text-red-600">*</span></h3><p className="mt-1 text-sm text-zinc-500">Obrigatória. Use a câmera se estiver no local.</p></div>
                <Camera className="h-5 w-5 text-emerald-700" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" disabled={busy} className="h-12 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => cameraRef.current?.click()}><Camera className="mr-2 h-4 w-4" />Tirar foto</Button>
                <Button type="button" variant="outline" disabled={busy} className="h-12 rounded-2xl" onClick={() => galleryRef.current?.click()}><ImagePlus className="mr-2 h-4 w-4" />Galeria</Button>
              </div>
              <input ref={cameraRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => { void addPhotos(event.target.files); event.target.value = ""; }} />
              <input ref={galleryRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { void addPhotos(event.target.files); event.target.value = ""; }} />
              {photoCount > 0 && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {pending.map((photo) => <div key={photo.id} className="relative"><PhotoPreview file={photo.file} /><button type="button" disabled={busy} aria-label="Remover foto" onClick={() => setPending((items) => items.filter((item) => item.id !== photo.id))} className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white"><X className="h-3.5 w-3.5" /></button></div>)}
                {record.photos.map((photo) => <div key={photo.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="Foto já salva do ponto" className="h-36 w-full rounded-2xl object-cover" />
                  <button type="button" disabled={busy} aria-label="Remover foto salva" onClick={() => setRecord((current) => ({ ...current, photos: current.photos.filter((item) => item.id !== photo.id) }))} className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white"><X className="h-3.5 w-3.5" /></button>
                </div>)}
              </div>}
            </section>

            <section>
              <h3 className="text-base font-semibold">O ponto está ativo?</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">{activities.map((choice) => <ChoiceButton key={choice.id} choice={{ ...choice, label: choice.id === "sim" ? "Sim, está ativo" : "Não, está inativo" }} letter={choice.id === "sim" ? "S" : "N"} pressed={record.answers.statusTrimestral === choice.value} disabled={busy} onClick={() => setActive(choice.value)} />)}</div>
            </section>

            {inactive ? <p className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">Ponto inativo: a volumetria fica como não se aplica. Se você vir resíduos, marque que o ponto está ativo.</p> : <section>
              <h3 className="text-base font-semibold">Volumetria do ponto</h3>
              <div className="mt-3 grid gap-2">{volumes.map((choice, choiceIndex) => <ChoiceButton key={choice.id} choice={choice} letter={letters[choiceIndex]} pressed={record.answers.volume === choice.value} disabled={busy} onClick={() => { setRecord((current) => ({ ...current, answers: { ...current.answers, volume: choice.value } })); setError(""); }} />)}</div>
            </section>}
            {record.kind === "trimestral" && <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50"><span className="block text-xs font-semibold uppercase tracking-wide text-emerald-700">Revitalização neste levantamento</span><span className="mt-1 block font-medium">{String(applyQuarterlyAutomation(withAutomaticContext({ ...record, answers: { ...record.answers, dataChecagem: localToday() } }), automation).answers.revitalizacao ?? "")}</span></p>}
          </div>}

          {step.id === "ficha" && <div className="mt-6"><PontoFichaFields draft={fichaDraftFromAnswers(record.answers)} locked={lockedFicha} disabled={busy} onChange={(draft) => { setRecord((current) => { const answers = { ...current.answers, ...draft, lote: "Lote 3" }; if (!isOutrosLogradouro(draft.tipoLogradouro)) delete answers.outroLogradouro; return { ...current, answers }; }); setError(""); }} /></div>}

          {step.id === "residuos" && <div className="mt-6 grid gap-2 sm:grid-cols-2">{RESIDUOS.map((item) => <CheckCard key={item.key} item={item} pressed={isMarked(record.answers[item.key])} disabled={busy} onClick={() => toggle(item.key)} />)}</div>}
          {step.id === "origens" && <div className="mt-6 grid gap-2 sm:grid-cols-2">{ORIGENS.map((item) => <CheckCard key={item.key} item={item} pressed={isMarked(record.answers[item.key])} disabled={busy} onClick={() => toggle(item.key)} />)}</div>}
          {step.id === "condicoes" && <div className="mt-6 grid gap-2 sm:grid-cols-2">{CONDICOES.map((item) => <CheckCard key={item.key} item={item} pressed={isMarked(record.answers[item.key])} disabled={busy} onClick={() => toggle(item.key)} />)}</div>}
          {step.id === "impactos" && <div className="mt-6 space-y-5">
            <p className="text-sm text-zinc-500">Assinale uma opção para cada item.</p>
            {[{ title: "Circulação de pedestres", Icon: Footprints, choices: pedestrians, key: "impactoPedestres" }, { title: "Tráfego de caminhões, motocicletas e/ou veículos", Icon: Truck, choices: vehicles, key: "impactoVeiculos" }].map((group) => (
              <section key={group.key} className="rounded-3xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="flex items-center gap-2 text-base font-semibold"><group.Icon className="h-5 w-5 text-emerald-700" />{group.title}</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">{group.choices.map((choice, choiceIndex) => <ChoiceButton key={choice.id} choice={choice} letter={letters[choiceIndex]} pressed={record.answers[group.key] === choice.value} disabled={busy} onClick={() => { setRecord((current) => ({ ...current, answers: { ...current.answers, [group.key]: choice.value } })); setError(""); }} />)}</div>
              </section>
            ))}
          </div>}
          {step.id === "proximidades" && <div className="mt-6 grid gap-2">{PROXIMIDADES.map((item) => <CheckCard key={item.key} item={item} pressed={isMarked(record.answers[item.key])} disabled={busy} onClick={() => toggle(item.key)} />)}</div>}
          {step.id === "revisao" && <div className="mt-6 space-y-5">
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">{OPERACAO_LEVANTAMENTO_NOTA}</p>
            <div><label htmlFor="vistoria-notas" className="mb-2 block text-sm font-medium">Observações</label><textarea id="vistoria-notas" disabled={busy} className="min-h-32 w-full rounded-3xl border bg-white p-4 text-base dark:bg-zinc-900" placeholder="Algo que a lista não cobriu? Escreva aqui." value={record.notes} onChange={(event) => setRecord((current) => ({ ...current, notes: event.target.value }))} /></div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              {[["Ponto", record.answers.codigo], ["Local", record.answers.endereco], ["Data da checagem", formatDate(localToday())], ["Sub-regional", regional || "Não identificada"], ["Coordenadas", coords || "Aguardando"]].map(([label, value]) => <p key={label} className="rounded-2xl bg-white px-4 py-3 dark:bg-zinc-900"><span className="block text-xs text-zinc-500">{label}</span><span className="font-medium">{String(value || "—")}</span></p>)}
            </div>
            <label className={`flex cursor-pointer items-start gap-3 rounded-3xl border-2 p-4 ${record.answers.termoVistoria === "sim" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}>
              <input type="checkbox" className="mt-1 h-5 w-5 accent-emerald-600" checked={record.answers.termoVistoria === "sim"} onChange={(event) => { setRecord((current) => ({ ...current, answers: { ...current.answers, termoVistoria: event.target.checked ? "sim" : "" } })); setError(""); }} />
              <span><span className="block font-semibold">Responsável pela vistoria</span><span className="mt-1 block text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">Eu, {responsible}, confirmo que fiz esta vistoria e o que marquei corresponde ao que vi no local.</span></span>
            </label>
          </div>}
        </div>
      </div>
      {error && <p role="alert" className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:px-8">{error}</p>}
      <footer className="border-t bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 dark:bg-zinc-950 sm:px-8">
        <div className="mx-auto flex max-w-3xl gap-3">
          <Button type="button" variant="outline" className="h-12 rounded-2xl" disabled={busy || !photosReady} onClick={() => void save(false)}><Save className="mr-2 h-4 w-4" />Rascunho</Button>
          <Button type="button" className="h-12 flex-1 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700" disabled={busy || !photosReady} onClick={() => { if (index >= steps.length - 1) { void save(true); return; } const problem = stepIssue(index); if (problem) { setError(problem); return; } go(index + 1); }}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : index >= steps.length - 1 ? <CloudUpload className="mr-2 h-4 w-4" /> : null}{index >= steps.length - 1 ? "Concluir vistoria" : "Continuar"}{index < steps.length - 1 && <ArrowRight className="ml-2 h-4 w-4" />}</Button>
        </div>
      </footer>
    </>
  );

  if (presentation === "page") return <section className="overflow-hidden rounded-3xl border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">{body}</section>;

  const dialogClass = presentation === "dialog"
    ? "flex h-[min(920px,92dvh)] max-h-[92dvh] w-[min(920px,96vw)] max-w-[920px] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-[920px]"
    : "inset-0 top-0 left-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 sm:max-w-none";

  return <Dialog open onOpenChange={(open) => { if (!open && !busy) void exit(); }}><DialogContent showCloseButton={false} className={dialogClass}>{body}</DialogContent></Dialog>;
}
