import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Network from "expo-network";
import { Button, Input } from "heroui-native";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { localToday, diagnosticErrors, type Diagnostic } from "../../../lib/diagnosticos";
import { saveDiagnostic } from "../../../lib/firestore/diagnosticos";
import { savePontoFicha } from "../../../lib/firestore/ponto-fichas";
import { OPERACAO_LEVANTAMENTO_NOTA } from "../../../lib/levantamentos";
import { fichaDraftFromAnswers } from "../../../lib/ponto-ficha";
import { CONDICOES, ORIGENS, PROXIMIDADES, RESIDUOS, activityChoices, applyQuarterlyAutomation, impactChoices, isMarked, materializeVistoria, pointIsInactive, volumeChoices, withAutomaticContext, type VistoriaCheck } from "../../../lib/vistoria-form";
import { CheckCard, ChoiceButton } from "@/components/choice-button";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { PointMiniMap } from "@/components/point-mini-map";
import { useAuth } from "@/features/auth";
import { formatDate, hasCoordinates, inkOn, subColor, subOf } from "@/features/format";
import { useWorkspace } from "@/features/workspace";
import { deleteStoredFilesByPublicUrls, uploadDiagnosticPhoto } from "@/lib/api";
import { clearDraft, persistPhotoFile, readDraft, readDraftPhotos, writeDraft, writeDraftPhotos, type PendingPhoto } from "@/lib/drafts";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  residuoDomiciliar: "home-outline",
  residuoEntulho: "construct-outline",
  residuoMoveis: "bed-outline",
  origemResidentes: "people-outline",
  origemPequenosTransportadores: "bicycle-outline",
  origemCacambeiros: "hammer-outline",
  origemGrandesTransportadores: "bus-outline",
  origemGrandesGeradores: "business-outline",
  riscoAves: "leaf-outline",
  riscoInsetos: "bug-outline",
  riscoPeconhentos: "warning-outline",
  riscoRoedores: "paw-outline",
  riscoAgua: "water-outline",
  riscoOdor: "cloud-outline",
  riscoQueimada: "flame-outline",
  vistoriaErosao: "triangle-outline",
  vistoriaDanosVia: "construct-outline",
  proximidadeConteiner: "trash-outline",
  proximidadePlaca: "alert-circle-outline",
  proximidadeCatadores: "refresh-outline",
  proximidadeCirculacaoRua: "walk-outline",
  proximidadeFixacaoRua: "bonfire-outline",
};

const STEPS: { id: "identificacao" | "residuos" | "origens" | "condicoes" | "impactos" | "proximidades" | "revisao"; title: string; help: string }[] = [
  { id: "identificacao", title: "Identificação do ponto", help: "O endereço, as coordenadas e a sub-regional já ficam salvos. A data da checagem é o dia em que você conclui este formulário, com a foto." },
  { id: "residuos", title: "1. Tipos de resíduos sólidos presentes", help: "Marque só o que encontrou. Se não houver nenhum destes, pode seguir sem marcar." },
  { id: "origens", title: "2. Possível origem do descarte", help: "Uma leitura do que parece ter gerado o material. Não precisa ter certeza absoluta." },
  { id: "condicoes", title: "3. Condições observadas no ponto", help: "Olhe o ponto e o chão ao redor. Marque o que estiver presente. A caçamba da Loga também: marcado é sim, sem marcar é não." },
  { id: "impactos", title: "4. Impactos na circulação", help: "Para cada item, escolha uma opção. Assim a gente entende se o descarte atrapalha quem passa." },
  { id: "proximidades", title: "5. Características nas proximidades", help: "Um raio curto, de até 15 metros. Marque o que existe por perto." },
  { id: "revisao", title: "Observações complementares", help: "Se quiser, deixe um recado com suas palavras. No fim, confirme que a vistoria é sua." },
];

const LETTERS = ["A", "B", "C", "D"];

async function compressPhoto(uri: string) {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 1600 });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return saved.uri;
}

export function VistoriaWizard({ initial, onClose, onSaved }: { initial: Diagnostic; onClose: () => void; onSaved: () => void }) {
  const insets = useSafeAreaInsets();
  const { user, responsible } = useAuth();
  const { automation } = useWorkspace();
  const [record, setRecord] = useState<Diagnostic>(() => withAutomaticContext(initial));
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [localError, setLocalError] = useState("");
  const step = STEPS[index] ?? STEPS[0];
  const inactive = pointIsInactive(record);
  const photoCount = pending.length + record.photos.length;

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([readDraft(user.uid, initial.id), readDraftPhotos(user.uid, initial.id)]).then(([saved, photos]) => {
      if (!active) return;
      if (saved && saved.revision === initial.revision && saved.id === initial.id) setRecord(withAutomaticContext(saved));
      setPending(photos);
      setReady(true);
    }).catch(() => { if (active) { setReady(true); setLocalError("Não foi possível recuperar o rascunho deste aparelho. As respostas da nuvem continuam disponíveis."); } });
    return () => { active = false; };
  }, [initial, user]);

  useEffect(() => {
    if (!user || !ready) return;
    const timer = setTimeout(() => {
      writeDraft(user.uid, record).catch(() => setLocalError("Não consegui guardar o rascunho neste aparelho. Envie ao servidor antes de sair."));
      writeDraftPhotos(user.uid, record.id, pending).catch(() => setLocalError("Não consegui guardar as fotos neste aparelho. Mantenha esta tela aberta até enviar."));
    }, 300);
    return () => clearTimeout(timer);
  }, [pending, ready, record, user]);

  const activities = activityChoices(record.questionnaireVersion);
  const volumes = volumeChoices(record.questionnaireVersion);
  const pedestrians = impactChoices("impactoPedestres", record.questionnaireVersion);
  const vehicles = impactChoices("impactoVeiculos", record.questionnaireVersion);
  const regional = subOf(record.answers.subprefeitura);
  const revitalizacao = useMemo(() => String(applyQuarterlyAutomation(withAutomaticContext({ ...record, answers: { ...record.answers, dataChecagem: localToday() } }), automation).answers.revitalizacao ?? ""), [automation, record]);

  function go(next: number) { setIndex(next); setError(""); }
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
  async function addPhotos(fromCamera: boolean) {
    const permission = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError(fromCamera ? "Libere a câmera para fotografar o ponto." : "Libere a galeria para escolher a foto."); return; }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsMultipleSelection: true });
    if (result.canceled) return;
    if (result.assets.length + pending.length + record.photos.length > 12) { setError("Dá para anexar até 12 fotos."); return; }
    setBusy(true);
    try {
      const next: PendingPhoto[] = [];
      for (const asset of result.assets) {
        if (asset.fileSize && asset.fileSize > 20 * 1024 * 1024) throw new Error("Cada foto pode ter no máximo 20 MB.");
        const compressed = await compressPhoto(asset.uri);
        const id = Crypto.randomUUID();
        const uri = await persistPhotoFile(id, compressed);
        next.push({ id, uri, mime: "image/jpeg" });
      }
      setPending((items) => [...items, ...next]);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível usar esta foto."); }
    finally { setBusy(false); }
  }
  function stepIssue(at: number) {
    const id = STEPS[at]?.id;
    if (id === "identificacao") {
      if (!/^[A-Z]{1,3}-\d+$/.test(String(record.answers.codigo ?? ""))) return "Informe o código do ponto, como CV-001.";
      if (!String(record.answers.endereco ?? "").trim()) return "Falta o endereço deste ponto.";
      if (!hasCoordinates(record)) return "Este ponto ainda não tem coordenadas no cadastro.";
      if (photoCount < 1) return "Tire a foto de hoje do ponto para continuar.";
      if (!String(record.answers.statusTrimestral ?? "").trim()) return "Me conta se o ponto está ativo.";
      if (!inactive && !volumeChoices(record.questionnaireVersion).some((choice) => choice.value === record.answers.volume)) return "Escolha a volumetria que você está vendo.";
    }
    if (id === "impactos" && (!record.answers.impactoPedestres || !record.answers.impactoVeiculos)) return "Escolha uma opção para pedestres e outra para veículos.";
    if (id === "revisao" && record.answers.termoVistoria !== "sim") return "Falta só confirmar que a vistoria é sua.";
    return "";
  }
  async function save(complete: boolean) {
    if (complete) {
      for (let at = 0; at < STEPS.length; at += 1) {
        const problem = stepIssue(at);
        if (problem) { go(at); setError(problem); return; }
      }
    }
    const network = await Network.getNetworkStateAsync();
    if (!network.isConnected) { setError("Sem rede. O rascunho fica neste aparelho até você enviar."); return; }
    const state = complete ? "concluido" as const : record.state === "importado" ? "importado" as const : "rascunho" as const;
    const answers = complete ? { ...record.answers, dataChecagem: localToday() } : record.answers;
    const prepared = { ...record, answers, state, responsibleName: responsible };
    let next = complete ? materializeVistoria(prepared, automation) : applyQuarterlyAutomation(withAutomaticContext(prepared), automation);
    next = { ...next, answers: { ...next.answers, termoVistoria: record.answers.termoVistoria === "sim" ? "sim" : "" } };
    const problems = diagnosticErrors(next, complete, initial.source ? initial : undefined);
    if (Object.keys(problems).length) { setError(Object.values(problems)[0] ?? "Revise os campos."); return; }
    setBusy(true);
    setError("");
    try {
      for (const photo of pending) {
        const path = `diagnosticos/${record.id}/${photo.id}.jpg`;
        const url = await uploadDiagnosticPhoto(path, photo.uri, photo.mime);
        next = { ...next, photos: [...next.photos, { id: photo.id, key: path, url, caption: "" }] };
      }
      await saveDiagnostic(next, responsible);
      if (complete && next.kind === "trimestral") {
        try { await savePontoFicha(String(next.answers.codigo ?? next.pointId), fichaDraftFromAnswers(next.answers)); }
        catch (cause) { setLocalError(cause instanceof Error ? cause.message : "A vistoria foi salva, mas a ficha do ponto não foi para a nuvem."); }
      }
      const removed = initial.photos.filter((photo) => !next.photos.some((item) => item.id === photo.id));
      if (removed.length) await deleteStoredFilesByPublicUrls(removed.map((photo) => photo.url)).catch(() => setLocalError("Registro salvo. Algumas fotos removidas ainda aguardam limpeza."));
      if (user) await clearDraft(user.uid, record.id).catch(() => undefined);
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha no envio. Suas respostas foram mantidas."); }
    finally { setBusy(false); }
  }

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: Math.max(insets.top, 12) }} className="flex-row items-center gap-3 bg-surface px-4 pb-3">
        <Pressable accessibilityRole="button" accessibilityLabel={index > 0 ? "Passo anterior" : "Voltar e manter o rascunho"} disabled={busy} onPress={() => { if (index > 0) go(index - 1); else onClose(); }} className="h-12 w-12 items-center justify-center rounded-2xl bg-default">
          <Ionicons name="arrow-back" size={22} color="#18181b" />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>{record.pointId || "Vistoria"}</Text>
          <Text className="text-xs text-muted" numberOfLines={1}>{String(record.answers.endereco || "Vamos registrar este ponto")}</Text>
        </View>
        <Text accessibilityLabel={`Passo ${index + 1} de ${STEPS.length}`} className="text-xs font-semibold text-accent">{index + 1}/{STEPS.length}</Text>
      </View>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: STEPS.length, now: index + 1 }} className="h-1 bg-accent-soft">
        <View className="h-full bg-accent" style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} />
      </View>
      <ScrollView contentContainerClassName="px-5 py-6 pb-12" keyboardShouldPersistTaps="handled">
        {localError ? <Text accessibilityRole="alert" className="mb-4 rounded-2xl bg-warning/20 p-3 text-sm text-foreground">{localError}</Text> : null}
        <Text className="text-xs font-semibold uppercase tracking-wider text-accent">Passo {index + 1} de {STEPS.length}</Text>
        <Text className="mt-2 text-2xl font-semibold leading-tight text-foreground">{step.title}</Text>
        <Text className="mt-2 text-sm leading-5 text-muted">{step.help}</Text>
        {step.id === "identificacao" && <Identification record={record} regional={regional} inactive={inactive} busy={busy} activities={activities} volumes={volumes} revitalizacao={revitalizacao} pending={pending} onCamera={() => void addPhotos(true)} onGallery={() => void addPhotos(false)} onActive={setActive} onVolume={(value) => { setRecord((current) => ({ ...current, answers: { ...current.answers, volume: value } })); setError(""); }} onRemovePending={(id) => setPending((items) => items.filter((item) => item.id !== id))} onRemoveSaved={(id) => setRecord((current) => ({ ...current, photos: current.photos.filter((item) => item.id !== id) }))} />}
        {step.id === "residuos" && <CheckGrid items={RESIDUOS} record={record} busy={busy} onToggle={toggle} />}
        {step.id === "origens" && <CheckGrid items={ORIGENS} record={record} busy={busy} onToggle={toggle} />}
        {step.id === "condicoes" && <CheckGrid items={CONDICOES} record={record} busy={busy} onToggle={toggle} />}
        {step.id === "impactos" && <View className="mt-6 gap-5">
          <ImpactGroup title="Circulação de pedestres" icon="walk-outline" choices={pedestrians} selected={String(record.answers.impactoPedestres ?? "")} disabled={busy} onSelect={(value) => { setRecord((current) => ({ ...current, answers: { ...current.answers, impactoPedestres: value } })); setError(""); }} />
          <ImpactGroup title="Tráfego de caminhões, motocicletas e veículos" icon="bus-outline" choices={vehicles} selected={String(record.answers.impactoVeiculos ?? "")} disabled={busy} onSelect={(value) => { setRecord((current) => ({ ...current, answers: { ...current.answers, impactoVeiculos: value } })); setError(""); }} />
        </View>}
        {step.id === "proximidades" && <CheckGrid items={PROXIMIDADES} record={record} busy={busy} onToggle={toggle} />}
        {step.id === "revisao" && <Review record={record} regional={regional} responsible={responsible} busy={busy} onNotes={(notes) => setRecord((current) => ({ ...current, notes }))} onTerm={(checked) => { setRecord((current) => ({ ...current, answers: { ...current.answers, termoVistoria: checked ? "sim" : "" } })); setError(""); }} />}
      </ScrollView>
      {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="border-t border-danger/30 bg-danger/10 px-5 py-3 text-sm text-danger">{error}</Text> : null}
      <View style={{ paddingBottom: Math.max(insets.bottom, 12) }} className="flex-row gap-3 border-t border-border bg-surface px-5 pt-3">
        <Button variant="secondary" className="min-h-12" isDisabled={busy || !ready} accessibilityLabel="Enviar rascunho" onPress={() => void save(false)}>Rascunho</Button>
        <Button className="min-h-12 flex-1" isDisabled={busy || !ready} onPress={() => { if (index >= STEPS.length - 1) { void save(true); return; } const problem = stepIssue(index); if (problem) { setError(problem); return; } go(index + 1); }}>
          {busy ? "Enviando…" : index >= STEPS.length - 1 ? "Concluir vistoria" : "Continuar"}
        </Button>
      </View>
    </View>
  );
}

function CheckGrid({ items, record, busy, onToggle }: { items: VistoriaCheck[]; record: Diagnostic; busy: boolean; onToggle: (key: string) => void }) {
  return <View className="mt-6 gap-2">{items.map((item) => <CheckCard key={item.key} label={item.label} icon={ICONS[item.key] ?? "ellipse-outline"} selected={isMarked(record.answers[item.key])} disabled={busy} onPress={() => onToggle(item.key)} />)}</View>;
}

function ImpactGroup({ title, icon, choices, selected, disabled, onSelect }: { title: string; icon: keyof typeof Ionicons.glyphMap; choices: { id: string; label: string; value: string }[]; selected: string; disabled: boolean; onSelect: (value: string) => void }) {
  return (
    <View accessibilityRole="radiogroup" className="gap-2 rounded-3xl bg-surface p-4">
      <Text className="text-base font-semibold text-foreground"><Ionicons name={icon} size={18} color="#16a34a" /> {title}</Text>
      {choices.map((choice, choiceIndex) => <ChoiceButton key={choice.id} letter={LETTERS[choiceIndex] ?? String(choiceIndex + 1)} label={choice.label} selected={selected === choice.value} disabled={disabled} onPress={() => onSelect(choice.value)} />)}
    </View>
  );
}

function Identification(props: {
  record: Diagnostic; regional: ReturnType<typeof subOf>; inactive: boolean; busy: boolean; revitalizacao: string;
  activities: { id: string; label: string; value: string }[]; volumes: { id: string; label: string; value: string }[];
  pending: PendingPhoto[]; onCamera: () => void; onGallery: () => void; onActive: (value: string) => void; onVolume: (value: string) => void;
  onRemovePending: (id: string) => void; onRemoveSaved: (id: string) => void;
}) {
  const { record, regional, inactive, busy, activities, volumes, revitalizacao, pending } = props;
  const [photo, setPhoto] = useState<string | null>(null);
  const lat = Number(record.answers.latitude);
  const lng = Number(record.answers.longitude);
  const color = subColor(regional.id);
  return (
    <View className="mt-6 gap-5">
      <View className="gap-3 rounded-3xl bg-surface p-4">
        {hasCoordinates(record) ? <PointMiniMap latitude={lat} longitude={lng} /> : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="location" size={18} color={color} />
          <Text className="text-lg font-semibold text-foreground">{String(record.answers.codigo ?? "")}</Text>
          <View style={{ marginLeft: "auto", borderRadius: 999, backgroundColor: color, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontFamily: "Geist_600SemiBold", fontSize: 12, color: inkOn(color) }}>{regional.label}</Text>
          </View>
        </View>
        <Text className="text-sm text-muted" numberOfLines={2}>{String(record.answers.endereco ?? "")}</Text>
        <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, backgroundColor: "#f4f4f5", paddingHorizontal: 10, paddingVertical: 6 }}>
          <Ionicons name="calendar-outline" size={14} color="#52525b" />
          <Text style={{ fontFamily: "Geist_500Medium", fontSize: 12, color: "#3f3f46" }}>{formatDate(localToday())}</Text>
        </View>
      </View>
      <View className="gap-3 rounded-3xl border border-dashed border-accent bg-surface p-4">
        <Text className="text-base font-semibold text-foreground">Foto atual do ponto</Text>
        <Text className="text-sm text-muted">Obrigatória. Toque na foto para ampliar.</Text>
        <View className="flex-row gap-2">
          <Button className="min-h-12 flex-1" isDisabled={busy} accessibilityLabel="Tirar foto do ponto" onPress={props.onCamera}>Tirar foto</Button>
          <Button variant="secondary" className="min-h-12 flex-1" isDisabled={busy} accessibilityLabel="Escolher foto da galeria" onPress={props.onGallery}>Galeria</Button>
        </View>
        <View className="flex-row flex-wrap gap-3">
          {pending.map((item) => <PhotoTile key={item.id} uri={item.uri} label="Remover foto ainda não enviada" onOpen={() => setPhoto(item.uri)} onRemove={() => props.onRemovePending(item.id)} disabled={busy} />)}
          {record.photos.map((item) => <PhotoTile key={item.id} uri={item.url} label="Remover foto já salva" onOpen={() => setPhoto(item.url)} onRemove={() => props.onRemoveSaved(item.id)} disabled={busy} />)}
        </View>
      </View>
      <PhotoLightbox uri={photo} onClose={() => setPhoto(null)} />
      <View accessibilityRole="radiogroup" className="gap-2">
        <Text className="text-base font-semibold text-foreground">O ponto está ativo?</Text>
        {activities.map((choice) => <ChoiceButton key={choice.id} letter={choice.id === "sim" ? "S" : "N"} label={choice.id === "sim" ? "Sim, está ativo" : "Não, está inativo"} selected={record.answers.statusTrimestral === choice.value} disabled={busy} onPress={() => props.onActive(choice.value)} />)}
      </View>
      {inactive ? <Text className="rounded-2xl bg-default p-4 text-sm leading-5 text-muted">Ponto inativo: a volumetria fica como não se aplica. Se você vir resíduos, marque que o ponto está ativo.</Text> : <View accessibilityRole="radiogroup" className="gap-2">
        <Text className="text-base font-semibold text-foreground">Volumetria do ponto</Text>
        {volumes.map((choice, choiceIndex) => <ChoiceButton key={choice.id} letter={LETTERS[choiceIndex] ?? "?"} label={choice.label} selected={record.answers.volume === choice.value} disabled={busy} onPress={() => props.onVolume(choice.value)} />)}
      </View>}
      {record.kind === "trimestral" && revitalizacao ? <Text className="rounded-2xl bg-accent-soft p-4 text-sm leading-5 text-foreground">Revitalização neste levantamento: {revitalizacao}</Text> : null}
    </View>
  );
}

function PhotoTile({ uri, label, onOpen, onRemove, disabled }: { uri: string; label: string; onOpen: () => void; onRemove: () => void; disabled: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Ampliar foto do ponto" onPress={onOpen} className="relative h-36 w-[47%] overflow-hidden rounded-2xl bg-default">
      <Image source={{ uri }} accessibilityLabel="Foto do ponto" className="h-full w-full" />
      <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onRemove} className="absolute right-2 top-2 h-11 w-11 items-center justify-center rounded-full bg-black/70">
        <Ionicons name="close" size={18} color="#fff" />
      </Pressable>
    </Pressable>
  );
}

function Review({ record, regional, responsible, busy, onNotes, onTerm }: { record: Diagnostic; regional: ReturnType<typeof subOf>; responsible: string; busy: boolean; onNotes: (value: string) => void; onTerm: (checked: boolean) => void }) {
  const confirmed = record.answers.termoVistoria === "sim";
  const color = subColor(regional.id);
  const marked = [...RESIDUOS, ...ORIGENS, ...CONDICOES, ...PROXIMIDADES].filter((item) => isMarked(record.answers[item.key]));
  return (
    <View className="mt-6 gap-5">
      <Text className="rounded-2xl bg-warning/20 p-4 text-sm leading-5 text-foreground">{OPERACAO_LEVANTAMENTO_NOTA}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <SummaryChip icon="pricetag" label={String(record.answers.codigo ?? "—")} />
        <SummaryChip icon="calendar" label={formatDate(localToday())} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 16, backgroundColor: color, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Ionicons name="map" size={16} color={inkOn(color)} />
          <Text style={{ fontFamily: "Geist_600SemiBold", fontSize: 13, color: inkOn(color) }}>{regional.label}</Text>
        </View>
      </View>
      <Text style={{ fontFamily: "Geist_400Regular", fontSize: 14, color: "#52525b" }}>{String(record.answers.endereco ?? "")}</Text>
      {marked.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {marked.map((item) => <View key={item.key} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 14, backgroundColor: "#ffffff", paddingHorizontal: 10, paddingVertical: 8 }}>
          <Ionicons name={ICONS[item.key] ?? "ellipse"} size={16} color="#15803d" />
          <Text style={{ fontFamily: "Geist_500Medium", fontSize: 12, color: "#18181b" }}>{item.label}</Text>
        </View>)}
      </View> : <Text className="text-sm text-muted">Nenhum item marcado nas listas.</Text>}
      <View style={{ gap: 8 }}>
        <Text className="text-sm font-medium text-foreground">Observações</Text>
        <Input accessibilityLabel="Observações" editable={!busy} multiline value={record.notes} onChangeText={onNotes} placeholder="Algo que a lista não cobriu? Escreva aqui." className="min-h-32" />
      </View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} accessibilityLabel={`Eu, ${responsible}, confirmo que fiz esta vistoria`} disabled={busy} onPress={() => onTerm(!confirmed)} className={`min-h-16 flex-row items-start gap-3 rounded-3xl border-2 p-4 ${confirmed ? "border-accent bg-accent-soft" : "border-border bg-surface"}`}>
        <Ionicons name={confirmed ? "checkmark-circle" : "ellipse-outline"} size={28} color={confirmed ? "#16a34a" : "#a1a1aa"} />
        <Text className="flex-1 text-sm leading-5 text-foreground">Eu, {responsible}, confirmo que fiz esta vistoria e o que marquei corresponde ao que vi no local.</Text>
      </Pressable>
    </View>
  );
}

function SummaryChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 16, backgroundColor: "#ffffff", paddingHorizontal: 12, paddingVertical: 10 }}>
      <Ionicons name={icon} size={16} color="#15803d" />
      <Text style={{ fontFamily: "Geist_600SemiBold", fontSize: 13, color: "#18181b" }}>{label}</Text>
    </View>
  );
}
