"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Waypoints,
  RefreshCcw,
  MapPin,
  Calendar,
  CheckCircle2,
  Briefcase,
  ImagePlus,
  Users,
  Megaphone,
  Layers,
  Type,
  Check,
  ChevronsUpDown,
  Loader2,
  Search,
} from "lucide-react";
import { DatePickerField } from "@/components/forms/date-picker-field";
import { SubregionalSelectField } from "@/components/forms/subregional-select-field";
import { TimePickerField } from "@/components/forms/time-picker-field";
import { ActionPhotoDropzone } from "@/components/acao-registro/action-photo-dropzone";
import { EquipeIntegrantesField } from "@/components/acao/equipe-integrantes-field";
import { LinksPostagemEditor } from "@/components/acao-registro/post-links";
import { integrantesFromAgendaEvent } from "@/lib/agenda/equipe-parsing";
import { useCustomPontosViciados } from "@/contexts/custom-pontos-viciados-context";
import { useAuth } from "@/contexts/auth-context";
import { useUserProfile } from "@/contexts/user-profile-context";
import type { HistoryRecordDoc } from "@/data/history-records";
import {
  createAgendaDocument,
  fetchAgendaEventByNumericId,
  mergeWriteAgendaEvent,
  updateAgendaEventFields,
  type AgendaEventFieldPatch,
} from "@/lib/firestore/agenda";
import { replaceHistoryFromCompletedAgendaEvent } from "@/lib/history-persist";
import { historyRecordDocToAgendaEvent } from "@/lib/history-to-agenda";
import { revokeBlobPhotoUrls } from "@/lib/storage/photo-url-helpers";
import { replaceDataUrlsWithStorage } from "@/lib/storage/upload-helpers";
import type {
  AgendaEvent,
  AgendaEventStatus,
  AgendaEventType,
} from "@/data/agenda-events";
import { format } from "date-fns";
import { useAgendaEvents } from "@/contexts/agenda-events-context";
import { AGENDA_TIME_UNSPECIFIED } from "@/lib/agenda/time-display";
import { firstNameForResponsible } from "@/lib/auth/responsible-default";
import {
  subregionalIdFromSubprefeitura,
  subregionalMeta,
  type SubregionalId,
} from "@/lib/constants/subregionais";
import type { ModalLocationMiniMapFlyTo } from "@/components/acao/modal-location-mini-map";

function RequiredStar() {
  return (
    <abbr
      title="Obrigatório"
      className="ml-0.5 cursor-help font-semibold text-red-500 no-underline"
      aria-label="(obrigatório)"
    >
      *
    </abbr>
  );
}

/** Evita saltos estranhos do browser com `required` + modais; corrige após validação app. */
function scrollModalFormToTop(container: HTMLDivElement | null) {
  if (!container) return;
  queueMicrotask(() => {
    container.scrollTo({ top: 0, behavior: "smooth" });
  });
}

export type NovaAcaoTipo = "acao-visita" | "revitalizacao";

export type NovaAcaoUIMode =
  | { kind: "none" }
  | { kind: "nova"; tipo: NovaAcaoTipo }
  | {
      kind: "edit";
      id: number;
      openAsFinalizado?: boolean;
      /** Quando o compromisso não existe em `agendaEvents` (ex.: só no histórico). */
      historyFallbackAgenda?: AgendaEvent;
    };

type NovaAcaoContextValue = {
  /** Modo atual (nova ação ou edição de compromisso). */
  mode: NovaAcaoUIMode;
  /** só criação — compatível com telas antigas */
  open: NovaAcaoTipo | null;
  openModal: (t: NovaAcaoTipo) => void;
  /** Abre o mesmo formulário Nova Ação / Revitalização com dados já salvos no Firestore. */
  openAgendaEventForEdit: (
    id: number,
    opts?: { openAsFinalizado?: boolean },
  ) => void;
  /** Abre Ação/Visita ou Revitalização a partir de um registro do Histórico. */
  openHistoryRecordForEdit: (record: HistoryRecordDoc) => void;
  close: () => void;
};

const NovaAcaoContext = React.createContext<NovaAcaoContextValue | null>(null);

export function useNovaAcao() {
  const ctx = React.useContext(NovaAcaoContext);
  if (!ctx) {
    throw new Error("useNovaAcao deve ser usado dentro de NovaAcaoProvider");
  }
  return ctx;
}

const TIPOS_SERVICO = [
  { value: "visita-tecnica", label: "Visita Técnica" },
  { value: "reuniao", label: "Reunião" },
  { value: "acao-ambiental", label: "Ação Ambiental" },
  { value: "evento", label: "Evento" },
  { value: "panfletagem", label: "Panfletagem somente" },
  { value: "capacitacao", label: "Capacitação / palestra" },
  { value: "outro", label: "Outro" },
] as const;

function tipoServicoToAgendaType(v: string): AgendaEventType {
  const map: Record<string, AgendaEventType> = {
    "visita-tecnica": "visita-tecnica",
    reuniao: "reuniao",
    "acao-ambiental": "acao-ambiental",
    evento: "evento",
    panfletagem: "panfletagem",
    capacitacao: "reuniao",
    outro: "acao-ambiental",
  };
  return map[v] ?? "acao-ambiental";
}

/** Primeiro tipo de UI que compacta neste AgendaEvent.type (ambiguidade aceitável ao reabrir). */
function tipoAgendaPreferenciaSelect(tipo: AgendaEventType): string {
  if (tipo === "fiscalizacao" || tipo === "vistoria") return "evento";
  const hit = [...TIPOS_SERVICO].find(
    (t) => tipoServicoToAgendaType(t.value) === tipo,
  );
  return hit?.value ?? "acao-ambiental";
}

function splitPrevistoObservations(raw: string) {
  const t = raw.trimStart();
  if (!t.startsWith("Previsto:")) {
    return { previsto: "", extra: raw.trim() };
  }
  const rest = raw.slice(raw.indexOf("Previsto:") + "Previsto:".length);
  const body = rest.replace(/^\s*\n?/, "");
  const double = body.indexOf("\n\n");
  if (double >= 0) {
    return {
      previsto: body.slice(0, double).trim(),
      extra: body.slice(double + 2).trim(),
    };
  }
  return { previsto: body.trim(), extra: "" };
}

function extractIdFromTituloRev(titulo: string): string {
  const m = /^Revitalização\s+—\s+(.+)\s*$/.exec(titulo.trim());
  return m?.[1]?.trim() ?? "";
}

const REVITALIZACAO_STRUCTURED_LINE =
  /^(Ponto viciado|Subprefeitura|Data da revitalização|Volume retirado|Resíduos|Equipe):\s*/;

/** Parse campo observations de revitalização criado pelo formulário. */
function parseRevitalizacaoObservations(observations: string) {
  const volM = /^Volume retirado:\s*(.+)$/m.exec(observations);
  const kgM = /^Resíduos:\s*(.+)$/m.exec(observations);
  const eqM = /^Equipe:\s*(\d+)\s*pessoa\(s\)$/m.exec(observations);
  return {
    volume: volM?.[1]?.replace(/\s*m³\s*$/i, "").trim() ?? "",
    kg: kgM?.[1]?.replace(/\s*kg\s*$/i, "").trim() ?? "",
    equipe: eqM?.[1]?.trim() ?? "",
  };
}

/** Extrai Previsto / Observações livres do texto estruturado de revitalização. */
function splitRevitalizacaoFreeText(observations: string) {
  const free = observations
    .split("\n")
    .filter((line) => !REVITALIZACAO_STRUCTURED_LINE.test(line.trim()))
    .join("\n")
    .trim();
  return splitPrevistoObservations(free);
}

function extractPontoViciado(observations: string): string {
  const m = /^Ponto viciado:\s*(.+)$/m.exec(observations ?? "");
  return m?.[1]?.trim() ?? "";
}

function parseLinks(text: string): string[] {
  return text.split(/\n/).map((l) => l.trim()).filter(Boolean);
}

type LocalGeocodeHit = { lat: number; lng: number; formatted_address: string };

const ModalLocationMiniMap = dynamic(
  () =>
    import("@/components/acao/modal-location-mini-map").then(
      (m) => m.ModalLocationMiniMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[220px] w-full items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 text-sm text-zinc-500 dark:text-zinc-400 dark:bg-zinc-800/50">
        A carregar mapa…
      </div>
    ),
  },
);

function fieldGrid() {
  return "grid gap-4 sm:grid-cols-2";
}

function ModalHero({
  icon: Icon,
  title,
  description,
  accentClassName,
  iconWrapperClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  accentClassName?: string;
  iconWrapperClassName?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-b border-zinc-100/80 bg-gradient-to-br px-6 py-5 sm:px-8 dark:border-zinc-800",
        accentClassName ?? "from-[var(--gradient-start)]/8 via-white to-[var(--gradient-end)]/6 dark:via-zinc-900 dark:from-[var(--gradient-start)]/15 dark:to-[var(--gradient-end)]/10",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg",
            iconWrapperClassName ??
              "bg-accent-gradient-br shadow-[var(--gradient-start)]/25",
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 space-y-1.5 pt-0.5">
          <DialogTitle className="text-left text-xl font-semibold tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {description}
          </DialogDescription>
        </div>
      </div>
    </div>
  );
}

function SectionBox({
  icon: Icon,
  title: sectionTitle,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-100 bg-zinc-50/50 p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-800/50",
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-zinc-900 text-[var(--gradient-accent)] shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-700">
          <Icon className="h-4 w-4" />
        </span>
        {sectionTitle}
      </div>
      {children}
    </div>
  );
}

function AcaoVisitaDialog({
  open,
  onOpenChange,
  initialEvent,
  preferFinalizado,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Se definido, modo edição (mesmo formulário que “Nova ação”). */
  initialEvent: AgendaEvent | null;
  /** Ex.: fluxo da agenda ao escolher “Concluído” — já abre em Finalizado. */
  preferFinalizado?: boolean;
}) {
  const [situacao, setSituacao] = React.useState<"agendar" | "finalizado">(
    "agendar",
  );
  const [camposErro, setCamposErro] = React.useState(false);
  const [acaoData, setAcaoData] = React.useState("");
  const [acaoHorario, setAcaoHorario] = React.useState("");
  const [localEndereco, setLocalEndereco] = React.useState("");
  const [locationCoords, setLocationCoords] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [coordsBoundAddress, setCoordsBoundAddress] = React.useState("");
  const [localPopoverOpen, setLocalPopoverOpen] = React.useState(false);
  const [localGeocodeHits, setLocalGeocodeHits] = React.useState<
    LocalGeocodeHit[]
  >([]);
  const [localGeocodeLoading, setLocalGeocodeLoading] = React.useState(false);
  const [localGeocodeError, setLocalGeocodeError] = React.useState<
    string | null
  >(null);
  const localGeocodeReq = React.useRef(0);
  const localMapFlyNonceRef = React.useRef(0);
  const [localMiniMapOpen, setLocalMiniMapOpen] = React.useState(false);
  const [localMapFlyTo, setLocalMapFlyTo] =
    React.useState<ModalLocationMiniMapFlyTo | null>(null);
  const [descricaoFeito, setDescricaoFeito] = React.useState("");
  const [observacoesGerais, setObservacoesGerais] = React.useState("");
  const [linksPostagemText, setLinksPostagemText] = React.useState("");
  const [fotoDataUrls, setFotoDataUrls] = React.useState<string[]>([]);
  const [tipoServico, setTipoServico] = React.useState("");
  const [panfletagemRealizada, setPanfletagemRealizada] = React.useState(false);
  const [unidadesPanfletos, setUnidadesPanfletos] = React.useState("");
  const [tituloAcao, setTituloAcao] = React.useState("");
  const [responsavelAcao, setResponsavelAcao] = React.useState("");
  const [subregionalAcao, setSubregionalAcao] = React.useState<
    SubregionalId | ""
  >("");
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [equipeIntegrantes, setEquipeIntegrantes] = React.useState<string[]>(
    [],
  );

  const formScrollRef = React.useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { profile } = useUserProfile();

  const isTipoPanfletagem = tipoServico === "panfletagem";
  const panfletPodeExibir = tipoServico.length > 0;

  React.useEffect(() => {
    if (!open) return;
    if (!initialEvent) {
      setSituacao("agendar");
      setCamposErro(false);
      setAcaoData("");
      setAcaoHorario("");
      setLocalEndereco("");
      setLocationCoords(null);
      setCoordsBoundAddress("");
      setLocalGeocodeHits([]);
      setLocalGeocodeError(null);
      setLocalPopoverOpen(false);
      setDescricaoFeito("");
      setObservacoesGerais("");
      setLinksPostagemText("");
      setFotoDataUrls((prev) => {
        revokeBlobPhotoUrls(prev);
        return [];
      });
      setTipoServico("");
      setPanfletagemRealizada(false);
      setUnidadesPanfletos("");
      setTituloAcao("");
      setResponsavelAcao("");
      setSubregionalAcao("");
      setEquipeIntegrantes([]);
      setSaveError(null);
      setSaving(false);
      setLocalMiniMapOpen(false);
      setLocalMapFlyTo(null);
      return;
    }
    setCamposErro(false);
    setSaveError(null);
    setLocalGeocodeError(null);
    setTipoServico(tipoAgendaPreferenciaSelect(initialEvent.type));
    setTituloAcao(initialEvent.title);
    setAcaoData(initialEvent.date);
    const tStart = initialEvent.time?.trim() ?? "";
    const tEnd = initialEvent.endTime?.trim() ?? "";
    const unspecified =
      !tStart ||
      tStart === AGENDA_TIME_UNSPECIFIED ||
      !tEnd ||
      tEnd === AGENDA_TIME_UNSPECIFIED;
    setAcaoHorario(unspecified ? "" : tStart);
    setLocalEndereco(initialEvent.location);
    const lat0 = initialEvent.locationLat;
    const lng0 = initialEvent.locationLng;
    if (
      typeof lat0 === "number" &&
      typeof lng0 === "number" &&
      Number.isFinite(lat0) &&
      Number.isFinite(lng0)
    ) {
      setLocationCoords({ lat: lat0, lng: lng0 });
      setCoordsBoundAddress(initialEvent.location.trim());
      setLocalMiniMapOpen(true);
      localMapFlyNonceRef.current += 1;
      setLocalMapFlyTo({
        lat: lat0,
        lng: lng0,
        zoom: 16,
        nonce: localMapFlyNonceRef.current,
      });
    } else {
      setLocationCoords(null);
      setCoordsBoundAddress("");
      setLocalMiniMapOpen(false);
      setLocalMapFlyTo(null);
    }
    setSubregionalAcao(initialEvent.subregional ?? "");
    setResponsavelAcao(
      initialEvent.responsible === "—" ? "" : initialEvent.responsible,
    );
    const completionUi =
      initialEvent.status === "concluido" || !!preferFinalizado;
    setSituacao(completionUi ? "finalizado" : "agendar");
    if (initialEvent.status === "concluido") {
      setDescricaoFeito(initialEvent.completionDescription ?? "");
      setObservacoesGerais(initialEvent.observations ?? "");
      setLinksPostagemText((initialEvent.linksPostagem ?? []).join("\n"));
      setFotoDataUrls((prev) => {
        revokeBlobPhotoUrls(prev);
        return [...(initialEvent.completionPhotoDataUrls ?? [])];
      });
    } else {
      const { previsto, extra } = splitPrevistoObservations(
        initialEvent.observations ?? "",
      );
      setDescricaoFeito(previsto);
      setObservacoesGerais(extra);
      if (preferFinalizado) {
        setLinksPostagemText((initialEvent.linksPostagem ?? []).join("\n"));
        setFotoDataUrls((prev) => {
          revokeBlobPhotoUrls(prev);
          return [...(initialEvent.completionPhotoDataUrls ?? [])];
        });
      } else {
        setLinksPostagemText("");
        setFotoDataUrls((prev) => {
          revokeBlobPhotoUrls(prev);
          return [];
        });
      }
    }
    const p = initialEvent.panfletosDistribuidos;
    if (typeof p === "number" && Number.isFinite(p)) {
      setUnidadesPanfletos(String(p));
      setPanfletagemRealizada(
        initialEvent.type === "panfletagem" || p > 0,
      );
    } else {
      setUnidadesPanfletos("");
      setPanfletagemRealizada(initialEvent.type === "panfletagem");
    }
    setEquipeIntegrantes(integrantesFromAgendaEvent(initialEvent));
  }, [open, initialEvent?.id, preferFinalizado]);

  const executeLocalGeocode = React.useCallback(async (queryRaw: string) => {
    const q = queryRaw.trim();
    if (q.length < 2) {
      setLocalGeocodeHits([]);
      setLocalGeocodeError("Indique pelo menos 2 caracteres para pesquisar.");
      setLocalPopoverOpen(true);
      return;
    }
    const seq = ++localGeocodeReq.current;
    setLocalGeocodeLoading(true);
    setLocalGeocodeError(null);
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: q }),
      });
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      const payload = data as {
        results?: LocalGeocodeHit[];
        error?: string;
      };
      if (seq !== localGeocodeReq.current) return;
      if (!res.ok) {
        setLocalGeocodeHits([]);
        const msg =
          typeof payload.error === "string" && payload.error.trim()
            ? payload.error
            : res.status === 503
              ? "Geocoding não configurado. Defina GOOGLE_MAPS_API_KEY ou NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no .env e reinicie o servidor."
              : `Não foi possível obter sugestões (${res.status}).`;
        setLocalGeocodeError(msg);
        setLocalPopoverOpen(true);
        return;
      }
      const hits = Array.isArray(payload.results) ? payload.results : [];
      setLocalGeocodeHits(hits);
      setLocalPopoverOpen(true);
      if (hits.length > 0) {
        localMapFlyNonceRef.current += 1;
        setLocalMapFlyTo({
          lat: hits[0]!.lat,
          lng: hits[0]!.lng,
          zoom: 16,
          nonce: localMapFlyNonceRef.current,
        });
      }
    } catch {
      if (localGeocodeReq.current === seq) {
        setLocalGeocodeHits([]);
        setLocalGeocodeError("Falha de rede ao contactar o servidor.");
        setLocalPopoverOpen(true);
      }
    } finally {
      if (localGeocodeReq.current === seq) setLocalGeocodeLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) {
      setLocalGeocodeHits([]);
      setLocalGeocodeError(null);
      setLocalGeocodeLoading(false);
      setLocalPopoverOpen(false);
      setLocalMiniMapOpen(false);
      setLocalMapFlyTo(null);
    }
  }, [open]);

  /** Troca tipo de serviço e regras de panfletagem sem “apagar” unidades vindas da edição. */
  function onTipoServicoChange(v: string) {
    setTipoServico(v);
    if (v === "panfletagem") {
      setPanfletagemRealizada(true);
    } else {
      setPanfletagemRealizada(false);
      setUnidadesPanfletos("");
    }
  }

  const handleModalMapPick = React.useCallback(async (lat: number, lng: number) => {
    setLocationCoords({ lat, lng });
    localMapFlyNonceRef.current += 1;
    setLocalMapFlyTo({
      lat,
      lng,
      zoom: 17,
      nonce: localMapFlyNonceRef.current,
    });
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      const payload = data as {
        results?: Array<{ formatted_address: string }>;
      };
      if (
        res.ok &&
        Array.isArray(payload.results) &&
        payload.results[0]?.formatted_address
      ) {
        const addr = payload.results[0].formatted_address;
        setLocalEndereco(addr);
        setCoordsBoundAddress(addr.trim());
      }
    } catch {
      /* coords mantidas; texto pode ser corrigido à mão */
    }
  }, []);

  function triggerLocalAddressSearch() {
    setLocalMiniMapOpen(true);
    void executeLocalGeocode(localEndereco);
  }

  const localAddressCoordPreview =
    locationCoords ??
    (localMapFlyTo
      ? { lat: localMapFlyTo.lat, lng: localMapFlyTo.lng }
      : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "!flex w-[min(100vw-1rem,56rem)] max-w-4xl flex-col gap-0 overflow-hidden border-zinc-200/80 p-0 shadow-2xl sm:max-w-4xl dark:border-zinc-800",
          "max-h-[min(92vh,920px)]",
        )}
        showCloseButton
      >
        <ModalHero
          icon={Waypoints}
          title="Ação / Visita"
          description="Agendamento futuro ou registro de ação concluída."
        />
        <form
          className="flex min-h-0 flex-1 flex-col"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setSaveError(null);
            setCamposErro(false);
            if (
              !tipoServico ||
              !tituloAcao.trim() ||
              !acaoData.trim() ||
              !localEndereco.trim() ||
              !subregionalAcao
            ) {
              setCamposErro(true);
              scrollModalFormToTop(formScrollRef.current);
              return;
            }
            const clockTrim = acaoHorario.trim();
            const clock =
              clockTrim !== ""
                ? clockTrim
                : AGENDA_TIME_UNSPECIFIED;
            const tipo = tipoServicoToAgendaType(tipoServico);
            const status: AgendaEventStatus =
              situacao === "agendar" ? "pendente" : "concluido";
            let observations = "";
            if (situacao === "agendar") {
              const chunks: string[] = [];
              if (descricaoFeito.trim())
                chunks.push(`Previsto:\n${descricaoFeito.trim()}`);
              if (observacoesGerais.trim()) chunks.push(observacoesGerais.trim());
              observations = chunks.join("\n\n");
            } else {
              observations = observacoesGerais.trim();
            }
            let completionDescription: string | undefined;
            if (
              situacao === "finalizado" &&
              descricaoFeito.trim()
            ) {
              completionDescription = descricaoFeito.trim();
            }
            const patch: Omit<AgendaEvent, "id"> = {
              title: tituloAcao.trim(),
              type: tipo,
              status,
              responsible:
                responsavelAcao.trim() ||
                firstNameForResponsible(user, profile?.nome) ||
                "—",
              date: acaoData,
              time: clock,
              endTime: clock,
              location: localEndereco.trim(),
              subregional: subregionalAcao,
              priority: situacao === "finalizado" ? "high" : "medium",
              observations,
              ...(completionDescription != null &&
              completionDescription !== ""
                ? { completionDescription }
                : {}),
            };
            if (situacao === "finalizado") {
              const ln = parseLinks(linksPostagemText);
              patch.linksPostagem = ln;
            } else {
              patch.linksPostagem = [];
            }
            if (isTipoPanfletagem || panfletagemRealizada) {
              const parsed = Number.parseInt(unidadesPanfletos, 10);
              if (Number.isFinite(parsed) && parsed >= 0) {
                patch.panfletosDistribuidos = parsed;
              }
            }
            const integrantesNomes = equipeIntegrantes
              .map((s) => s.trim())
              .filter(Boolean);
            patch.equipeIntegrantes = integrantesNomes;
            patch.equipe =
              integrantesNomes.length > 0 ? integrantesNomes.join(", ") : "";

            const fieldPatch: AgendaEventFieldPatch = {
              ...patch,
              ...(locationCoords
                ? {
                    locationLat: locationCoords.lat,
                    locationLng: locationCoords.lng,
                  }
                : initialEvent?.id != null
                  ? { locationLat: null, locationLng: null }
                  : {}),
            };

            setSaving(true);
            try {
              let targetId: number;
              if (initialEvent?.id != null) {
                targetId = initialEvent.id;
                const remote = await fetchAgendaEventByNumericId(targetId);
                if (remote) {
                  await updateAgendaEventFields(targetId, fieldPatch);
                } else {
                  await mergeWriteAgendaEvent({
                    ...initialEvent,
                    ...fieldPatch,
                    id: targetId,
                    createdByUid:
                      initialEvent.createdByUid ?? user?.uid,
                  });
                }
              } else {
                const createPayload: Omit<AgendaEvent, "id"> = {
                  ...patch,
                  ...(locationCoords
                    ? {
                        locationLat: locationCoords.lat,
                        locationLng: locationCoords.lng,
                      }
                    : {}),
                };
                targetId = await createAgendaDocument({
                  ...createPayload,
                  ...(user?.uid ? { createdByUid: user.uid } : {}),
                });
              }
              if (
                situacao === "finalizado" &&
                fotoDataUrls.length > 0
              ) {
                const urls = await replaceDataUrlsWithStorage(
                  fotoDataUrls,
                  `agenda/${targetId}/completion`,
                );
                if (urls?.length) {
                  await updateAgendaEventFields(targetId, {
                    completionPhotoDataUrls: urls,
                  });
                }
              }
              if (situacao === "finalizado") {
                const fresh = await fetchAgendaEventByNumericId(targetId);
                if (fresh) await replaceHistoryFromCompletedAgendaEvent(fresh);
              }
              onOpenChange(false);
            } catch (err) {
              console.error(err);
              setSaveError("Não foi possível salvar. Tente de novo.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <div
            ref={formScrollRef}
            className={cn(
              "agir-dialog-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain",
              "px-6 py-5 sm:px-10 sm:py-6",
            )}
          >
            <div className="space-y-5">
              {saveError && (
                <p className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {saveError}
                </p>
              )}
              {camposErro && (
                <p className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  Preencha tipo de serviço, título, data, local / endereço e
                  subregional.
                </p>
              )}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Situação
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSituacao("agendar");
                      setLinksPostagemText("");
                      setFotoDataUrls((prev) => {
                        revokeBlobPhotoUrls(prev);
                        return [];
                      });
                    }}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                      situacao === "agendar"
                        ? "border-[var(--gradient-start)]/50 bg-gradient-to-br from-[var(--gradient-start)]/5 to-white shadow-md dark:from-fuchsia-950/50 dark:to-zinc-900"
                        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        situacao === "agendar"
                          ? "bg-accent-gradient-br text-white"
                          : "bg-zinc-100 text-zinc-500 dark:text-zinc-400 dark:bg-zinc-800",
                      )}
                    >
                      <Calendar className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                        Agendar
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                        Compromisso planejado — sem necessidade de fotos.
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSituacao("finalizado")}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                      situacao === "finalizado"
                        ? "border-[var(--gradient-start)]/50 bg-gradient-to-br from-[var(--gradient-end)]/5 to-white shadow-md dark:from-fuchsia-950/50 dark:to-zinc-900"
                        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        situacao === "finalizado"
                          ? "bg-accent-gradient-br text-white"
                          : "bg-zinc-100 text-zinc-500 dark:text-zinc-400 dark:bg-zinc-800",
                      )}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                        Finalizado
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                        Ação concluída — fotos opcionais por enquanto.
                      </span>
                    </span>
                  </button>
                </div>
              </div>

              <SectionBox icon={Type} title="Classificação e título">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="tipo-servico"
                      className="text-zinc-600 dark:text-zinc-400"
                    >
                      Tipo de serviço
                      <RequiredStar />
                    </Label>
                    <input
                      type="hidden"
                      name="tipo-servico"
                      value={tipoServico}
                    />
                    <Select
                      value={tipoServico || undefined}
                      onValueChange={onTipoServicoChange}
                    >
                      <SelectTrigger
                        id="tipo-servico"
                        className={cn(
                          "h-11 w-full min-w-0 border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-700",
                          camposErro &&
                            !tipoServico &&
                            "border-red-300 ring-1 ring-red-200 dark:border-red-700 dark:ring-red-900",
                        )}
                        size="default"
                      >
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_SERVICO.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="acao-titulo"
                      className="text-zinc-600 dark:text-zinc-400"
                    >
                      Título / assunto
                      <RequiredStar />
                    </Label>
                    <Input
                      id="acao-titulo"
                      name="titulo"
                      className={cn(
                        "h-11 border-zinc-200 dark:border-zinc-700",
                        camposErro &&
                          !tituloAcao.trim() &&
                          "border-red-300 ring-1 ring-red-200 dark:border-red-700 dark:ring-red-900",
                      )}
                      placeholder="Ex.: Orientação no Ecoponto Norte"
                      value={tituloAcao}
                      onChange={(e) => setTituloAcao(e.target.value)}
                    />
                  </div>
                </div>
              </SectionBox>

              {panfletPodeExibir && (
                <SectionBox icon={Megaphone} title="Panfletagem no local">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Label
                        htmlFor="unidades-panf-acao"
                        className="text-zinc-600 dark:text-zinc-400"
                      >
                        Unidades distribuídas
                      </Label>
                      {(!isTipoPanfletagem && !panfletagemRealizada) ? (
                        <input
                          type="hidden"
                          name="unidades-panfletos"
                          value="0"
                        />
                      ) : null}
                      <Input
                        id="unidades-panf-acao"
                        name={
                          isTipoPanfletagem || panfletagemRealizada
                            ? "unidades-panfletos"
                            : undefined
                        }
                        type="number"
                        min={0}
                        placeholder="0"
                        className="h-11 max-w-xs border-zinc-200 dark:border-zinc-700"
                        value={unidadesPanfletos}
                        onChange={(e) =>
                          setUnidadesPanfletos(
                            (isTipoPanfletagem || panfletagemRealizada)
                              ? e.target.value
                              : "",
                          )
                        }
                        disabled={!isTipoPanfletagem && !panfletagemRealizada}
                      />
                    </div>
                    <div
                      className={cn(
                        "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 ring-1",
                        isTipoPanfletagem
                          ? "bg-amber-50/80 ring-amber-200 dark:bg-amber-950/40 dark:ring-amber-800"
                          : "bg-white dark:bg-zinc-900 ring-zinc-200 dark:ring-zinc-700",
                      )}
                    >
                      <Checkbox
                        id="panf-real-acao"
                        name="panfletagemRealizada"
                        disabled={isTipoPanfletagem}
                        checked={isTipoPanfletagem || panfletagemRealizada}
                        onCheckedChange={(c) => {
                          if (isTipoPanfletagem) return;
                          const next = c === true;
                          setPanfletagemRealizada(next);
                          if (!next) setUnidadesPanfletos("");
                        }}
                      />
                      <input
                        type="hidden"
                        name="panfletagemRealizada"
                        value={
                          isTipoPanfletagem || panfletagemRealizada
                            ? "on"
                            : "off"
                        }
                      />
                      <Label
                        htmlFor="panf-real-acao"
                        className={cn(
                          "text-sm font-medium leading-tight",
                          isTipoPanfletagem
                            ? "cursor-default text-amber-900 dark:text-amber-200"
                            : "cursor-pointer text-zinc-700 dark:text-zinc-300",
                        )}
                      >
                        {isTipoPanfletagem
                          ? "Panfletagem (natureza da ação — sempre ativa)"
                          : "Panfletagem realizada"}
                      </Label>
                    </div>
                  </div>
                  {isTipoPanfletagem && (
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      Para o tipo &quot;Panfletagem&quot;, a ação trata
                      exclusivamente de panfletagem; não é possível
                      desativar.
                    </p>
                  )}
                </SectionBox>
              )}

              <SectionBox icon={MapPin} title="Quando e onde">
                <div className={fieldGrid()}>
                  <div className="space-y-2">
                    <Label
                      htmlFor="acao-data"
                      className="text-zinc-600 dark:text-zinc-400"
                    >
                      Data
                      <RequiredStar />
                    </Label>
                    <DatePickerField
                      id="acao-data"
                      value={acaoData}
                      onChange={setAcaoData}
                      invalid={camposErro && !acaoData.trim()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="acao-horario"
                      className="text-zinc-600 dark:text-zinc-400"
                    >
                      Horário (opcional)
                    </Label>
                    <TimePickerField
                      id="acao-horario"
                      value={acaoHorario}
                      onChange={setAcaoHorario}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    {localMiniMapOpen ? (
                      <div className="space-y-2">
                        <ModalLocationMiniMap
                          marker={localAddressCoordPreview}
                          flyTo={localMapFlyTo}
                          onMapClick={handleModalMapPick}
                        />
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Toque no mapa para definir ou corrigir o ponto; o
                          texto do local atualiza por geocoding reverso. A lupa
                          mantém a pesquisa por endereço e sugestões.
                        </p>
                      </div>
                    ) : null}
                    <Label
                      htmlFor="acao-local"
                      className="text-zinc-600 dark:text-zinc-400"
                    >
                      Local / endereço
                      <RequiredStar />
                    </Label>
                    <Popover
                      modal={false}
                      open={localPopoverOpen}
                      onOpenChange={setLocalPopoverOpen}
                    >
                      <PopoverAnchor asChild>
                        <div className="relative w-full">
                          <Input
                            id="acao-local"
                            name="local"
                            autoCorrect="off"
                            spellCheck={false}
                            className={cn(
                              "h-11 border-zinc-200 dark:border-zinc-700 pr-12",
                              camposErro &&
                                !localEndereco.trim() &&
                                "border-red-300 ring-1 ring-red-200 dark:border-red-700 dark:ring-red-900",
                            )}
                            placeholder="Rua, número, bairro ou nome do local"
                            value={localEndereco}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLocalEndereco(v);
                              if (v.trim() !== coordsBoundAddress.trim()) {
                                setLocationCoords(null);
                                setCoordsBoundAddress("");
                                setLocalMapFlyTo(null);
                              }
                            }}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            triggerLocalAddressSearch();
                          }}
                          onFocus={() => {
                            if (localGeocodeHits.length > 0) {
                              setLocalPopoverOpen(true);
                            }
                          }}
                          autoComplete="off"
                          />
                          <Button
                            type="button"
                            size="icon"
                            disabled={saving || localGeocodeLoading}
                            title="Pesquisar endereço e mostrar mapa"
                            aria-label="Pesquisar endereço e mostrar mapa"
                            className="absolute right-1 top-1/2 h-9 w-9 shrink-0 -translate-y-1/2 rounded-lg bg-accent-gradient-br text-white shadow-sm hover:opacity-95 disabled:opacity-50"
                            onClick={triggerLocalAddressSearch}
                          >
                            {localGeocodeLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </PopoverAnchor>
                      <PopoverContent
                        className="z-[300] w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[min(100vw-2rem,32rem)] p-0 shadow-lg"
                        align="start"
                        onOpenAutoFocus={(ev) => ev.preventDefault()}
                      >
                        <Command shouldFilter={false}>
                          <CommandList className="max-h-[min(50vh,280px)]">
                            {localGeocodeLoading ? (
                              <div className="flex items-center justify-center gap-2 py-6 text-sm text-zinc-500 dark:text-zinc-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                A procurar endereços…
                              </div>
                            ) : null}
                            {!localGeocodeLoading && localGeocodeError ? (
                              <div className="border-b border-zinc-100 px-3 py-3 text-sm text-red-700 dark:border-zinc-800 dark:text-red-400">
                                {localGeocodeError}
                              </div>
                            ) : null}
                            {!localGeocodeLoading &&
                            !localGeocodeError &&
                            localEndereco.trim().length >= 2 &&
                            localGeocodeHits.length === 0 ? (
                              <CommandEmpty>
                                Nenhum resultado — tente outro termo.
                              </CommandEmpty>
                            ) : null}
                            <CommandGroup heading="Sugestões">
                              {localGeocodeHits.map((hit, idx) => (
                                <CommandItem
                                  key={`${hit.lat}-${hit.lng}-${idx}`}
                                  value={hit.formatted_address}
                                  onSelect={() => {
                                    setLocalMiniMapOpen(true);
                                    localMapFlyNonceRef.current += 1;
                                    setLocalMapFlyTo({
                                      lat: hit.lat,
                                      lng: hit.lng,
                                      zoom: 17,
                                      nonce: localMapFlyNonceRef.current,
                                    });
                                    setLocalEndereco(hit.formatted_address);
                                    setLocationCoords({
                                      lat: hit.lat,
                                      lng: hit.lng,
                                    });
                                    setCoordsBoundAddress(
                                      hit.formatted_address.trim(),
                                    );
                                    setLocalPopoverOpen(false);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <MapPin className="mr-2 h-4 w-4 shrink-0 text-zinc-400" />
                                  <span className="line-clamp-2">
                                    {hit.formatted_address}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 tabular-nums">
                      Lat{" "}
                      {localAddressCoordPreview
                        ? localAddressCoordPreview.lat.toFixed(6)
                        : "—"}
                      {", "}
                      Lng{" "}
                      {localAddressCoordPreview
                        ? localAddressCoordPreview.lng.toFixed(6)
                        : "—"}
                    </p>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="acao-resp"
                      className="text-zinc-600 dark:text-zinc-400"
                    >
                      Responsável
                    </Label>
                    <Input
                      id="acao-resp"
                      name="responsavel"
                      className="h-11 border-zinc-200 dark:border-zinc-700"
                      placeholder="Nome do agente ou equipe"
                      value={responsavelAcao}
                      onChange={(e) => setResponsavelAcao(e.target.value)}
                    />
                  </div>
                  <SubregionalSelectField
                    id="acao-subregional"
                    value={subregionalAcao}
                    onChange={setSubregionalAcao}
                    error={camposErro && !subregionalAcao}
                    labelSuffix={<RequiredStar />}
                  />
                </div>
              </SectionBox>

              <EquipeIntegrantesField
                fieldKey={String(initialEvent?.id ?? "nova")}
                subscribeActive={open}
                value={equipeIntegrantes}
                onChange={setEquipeIntegrantes}
                disabled={saving}
              />

              <SectionBox
                icon={Briefcase}
                title={
                  situacao === "agendar"
                    ? "Detalhes do agendamento"
                    : "Informações da ação concluída"
                }
              >
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="acao-feito"
                      className="text-zinc-600 dark:text-zinc-400"
                    >
                      {situacao === "agendar"
                        ? "O que está previsto"
                        : "O que foi feito"}
                    </Label>
                    <Textarea
                      id="acao-feito"
                      name="oQueFoiFeito"
                      value={descricaoFeito}
                      onChange={(e) => setDescricaoFeito(e.target.value)}
                      placeholder={
                        situacao === "agendar"
                          ? "Objetivo, materiais, encaminhamentos previstos…"
                          : "Resumo do trabalho realizado, etapas e resultados…"
                      }
                      className="min-h-[100px] resize-y border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="acao-obs"
                      className="text-zinc-600 dark:text-zinc-400"
                    >
                      Observações
                    </Label>
                    <Textarea
                      id="acao-obs"
                      name="observacoes"
                      value={observacoesGerais}
                      onChange={(e) => setObservacoesGerais(e.target.value)}
                      placeholder="Notas, pendências, próximos passos…"
                      className="min-h-[88px] resize-y border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                </div>
              </SectionBox>

              {situacao === "finalizado" && (
                <LinksPostagemEditor
                  id="acao-links-postagem"
                  name="linksPostagem"
                  value={linksPostagemText}
                  onChange={setLinksPostagemText}
                  hint="Um link por linha. No histórico e na agenda, cada URL aparece como atalho com ícone de abrir em nova página."
                  textareaClassName="bg-white dark:bg-zinc-900"
                />
              )}


              {situacao === "finalizado" && (
                <div className="rounded-2xl border-2 border-zinc-200/90 bg-zinc-50/60 p-5 sm:p-6 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <div className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-200/80 text-zinc-700 dark:text-zinc-300 dark:bg-zinc-800">
                      <ImagePlus className="h-4 w-4" />
                    </span>
                    Registro fotográfico
                  </div>
              
                  <ActionPhotoDropzone
                    photoDataUrls={fotoDataUrls}
                    onChange={setFotoDataUrls}
                    variant="amber"
                    label="Imagens ou vídeo"
                    hint="Clique ou arraste imagens ou vídeo para esta área"
                    orderHint="Arraste as miniaturas para definir a ordem nas evidências e na galeria."
                  />
                </div>
              )}
            </div>
          </div>
          <Separator className="shrink-0" />
          <DialogFooter className="shrink-0 gap-2 bg-zinc-50/40 p-4 sm:justify-end sm:px-10 sm:py-5 dark:bg-zinc-900/60">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-11 rounded-xl bg-accent-gradient text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                  Salvando…
                </>
              ) : situacao === "agendar" ? (
                "Salvar agendamento"
              ) : (
                "Salvar registro"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RevitalizacaoDialog({
  open,
  onOpenChange,
  initialEvent,
  preferFinalizado,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialEvent: AgendaEvent | null;
  preferFinalizado?: boolean;
}) {
  const { pontosVicioFormOptions, addPontoViciado } = useCustomPontosViciados();
  const [situacaoRev, setSituacaoRev] = React.useState<
    "agendar" | "finalizado"
  >("agendar");
  const [pontoViciadoId, setPontoViciadoId] = React.useState<string>("");
  const [pvComboOpen, setPvComboOpen] = React.useState(false);
  const [pvSearch, setPvSearch] = React.useState("");

  const { user } = useAuth();
  const { profile } = useUserProfile();

  const [addingNewPonto, setAddingNewPonto] = React.useState(false);
  const [newPontoCodigo, setNewPontoCodigo] = React.useState("");
  const [newPontoAddress, setNewPontoAddress] = React.useState("");
  const [newPontoSubprefeitura, setNewPontoSubprefeitura] = React.useState("");
  const [newPontoLat, setNewPontoLat] = React.useState<number | null>(null);
  const [newPontoLng, setNewPontoLng] = React.useState<number | null>(null);
  const [newPontoSaving, setNewPontoSaving] = React.useState(false);
  const [newPontoError, setNewPontoError] = React.useState<string | null>(null);
  const [newPontoSearchQuery, setNewPontoSearchQuery] = React.useState("");
  const [newPontoSearching, setNewPontoSearching] = React.useState(false);
  const [newPontoMapFlyTo, setNewPontoMapFlyTo] =
    React.useState<ModalLocationMiniMapFlyTo | null>(null);
  const newPontoFlyNonce = React.useRef(0);

  const resetNewPontoForm = React.useCallback(() => {
    setAddingNewPonto(false);
    setNewPontoCodigo("");
    setNewPontoAddress("");
    setNewPontoSubprefeitura("");
    setNewPontoLat(null);
    setNewPontoLng(null);
    setNewPontoError(null);
    setNewPontoSearchQuery("");
    setNewPontoMapFlyTo(null);
  }, []);

  const handleNewPontoSearch = React.useCallback(async () => {
    const q = newPontoSearchQuery.trim();
    if (q.length < 2) return;
    setNewPontoSearching(true);
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: q }),
      });
      const data = (await res.json()) as {
        results?: { lat: number; lng: number; formatted_address: string }[];
      };
      const hit = data.results?.[0];
      if (hit) {
        setNewPontoLat(hit.lat);
        setNewPontoLng(hit.lng);
        if (!newPontoAddress) setNewPontoAddress(hit.formatted_address);
        newPontoFlyNonce.current += 1;
        setNewPontoMapFlyTo({
          lat: hit.lat,
          lng: hit.lng,
          zoom: 17,
          nonce: newPontoFlyNonce.current,
        });
      }
    } catch {
      /* silently fail */
    } finally {
      setNewPontoSearching(false);
    }
  }, [newPontoSearchQuery, newPontoAddress]);

  const handleNewPontoMapClick = React.useCallback(
    async (lat: number, lng: number) => {
      setNewPontoLat(lat);
      setNewPontoLng(lng);
      newPontoFlyNonce.current += 1;
      setNewPontoMapFlyTo({
        lat,
        lng,
        zoom: 17,
        nonce: newPontoFlyNonce.current,
      });
      try {
        const res = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        });
        const data = (await res.json()) as {
          results?: { formatted_address: string }[];
        };
        const addr = data.results?.[0]?.formatted_address;
        if (addr) setNewPontoAddress(addr);
      } catch {
        /* silently fail */
      }
    },
    [],
  );

  const handleSaveNewPonto = React.useCallback(async () => {
    setNewPontoError(null);
    const codigo = newPontoCodigo.trim();
    if (!codigo) {
      setNewPontoError("Informe o código do ponto.");
      return;
    }
    if (pontosVicioFormOptions.some((p) => p.id === codigo)) {
      setNewPontoError("Já existe um ponto com este código.");
      return;
    }
    if (newPontoLat == null || newPontoLng == null) {
      setNewPontoError("Busque ou clique no mapa para definir a localização.");
      return;
    }
    setNewPontoSaving(true);
    try {
      await addPontoViciado({
        codigo,
        address: newPontoAddress.trim() || "Sem endereço",
        subprefeitura: newPontoSubprefeitura.trim(),
        lat: newPontoLat,
        lng: newPontoLng,
        createdByUid: user?.uid,
      });
      setPontoViciadoId(codigo);
      resetNewPontoForm();
    } catch (err) {
      setNewPontoError(
        err instanceof Error ? err.message : "Erro ao salvar ponto.",
      );
    } finally {
      setNewPontoSaving(false);
    }
  }, [
    newPontoCodigo,
    newPontoAddress,
    newPontoSubprefeitura,
    newPontoLat,
    newPontoLng,
    pontosVicioFormOptions,
    addPontoViciado,
    user?.uid,
    resetNewPontoForm,
  ]);
  const [revFotoUrls, setRevFotoUrls] = React.useState<string[]>([]);
  const [linksPostagemText, setLinksPostagemText] = React.useState("");
  const [panfletagemRealizada, setPanfletagemRealizada] = React.useState(false);
  const [unidadesPanfletos, setUnidadesPanfletos] = React.useState("");
  const [dataRevitalizacao, setDataRevitalizacao] = React.useState(() =>
    format(new Date(), "yyyy-MM-dd"),
  );
  const [horarioRev, setHorarioRev] = React.useState("");
  const [descricaoFeitoRev, setDescricaoFeitoRev] = React.useState("");
  const [observacoesGeraisRev, setObservacoesGeraisRev] = React.useState("");
  const [volumeRev, setVolumeRev] = React.useState("");
  const [kgRev, setKgRev] = React.useState("");
  const [equipeRev, setEquipeRev] = React.useState("");
  const [saveErrorRev, setSaveErrorRev] = React.useState<string | null>(null);
  const [savingRev, setSavingRev] = React.useState(false);
  const [pontoErro, setPontoErro] = React.useState(false);
  const revitalizacaoFormScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    if (!initialEvent) {
      setSituacaoRev("agendar");
      setPontoViciadoId("");
      setPvComboOpen(false);
      setPvSearch("");
      setRevFotoUrls((prev) => {
        revokeBlobPhotoUrls(prev);
        return [];
      });
      setLinksPostagemText("");
      setPanfletagemRealizada(false);
      setUnidadesPanfletos("");
      setVolumeRev("");
      setKgRev("");
      setEquipeRev("");
      setDataRevitalizacao(format(new Date(), "yyyy-MM-dd"));
      setHorarioRev("");
      setDescricaoFeitoRev("");
      setObservacoesGeraisRev("");
      setSaveErrorRev(null);
      setSavingRev(false);
      setPontoErro(false);
      resetNewPontoForm();
      return;
    }
    setSaveErrorRev(null);
    resetNewPontoForm();
    setSavingRev(false);
    setPontoErro(false);
    setDataRevitalizacao(initialEvent.date);
    const tStart = initialEvent.time?.trim() ?? "";
    const tEnd = initialEvent.endTime?.trim() ?? "";
    const unspecified =
      !tStart ||
      tStart === AGENDA_TIME_UNSPECIFIED ||
      !tEnd ||
      tEnd === AGENDA_TIME_UNSPECIFIED;
    setHorarioRev(unspecified ? "" : tStart);
    setSituacaoRev(
      initialEvent.status === "concluido" || preferFinalizado
        ? "finalizado"
        : "agendar",
    );
    const fromTit = extractIdFromTituloRev(initialEvent.title);
    const fromObs = extractPontoViciado(initialEvent.observations ?? "");
    setPontoViciadoId(fromTit || fromObs || "");
    const parsed = parseRevitalizacaoObservations(
      initialEvent.observations ?? "",
    );
    setVolumeRev(parsed.volume);
    setKgRev(parsed.kg);
    setEquipeRev(parsed.equipe);
    if (initialEvent.status === "concluido") {
      const { previsto, extra } = splitRevitalizacaoFreeText(
        initialEvent.observations ?? "",
      );
      setDescricaoFeitoRev(
        initialEvent.completionDescription?.trim() || previsto,
      );
      setObservacoesGeraisRev(extra);
      setRevFotoUrls((prev) => {
        revokeBlobPhotoUrls(prev);
        return [...(initialEvent.completionPhotoDataUrls ?? [])];
      });
      setLinksPostagemText((initialEvent.linksPostagem ?? []).join("\n"));
    } else {
      const { previsto, extra } = splitRevitalizacaoFreeText(
        initialEvent.observations ?? "",
      );
      setDescricaoFeitoRev(previsto);
      setObservacoesGeraisRev(extra);
      if (preferFinalizado) {
        setLinksPostagemText((initialEvent.linksPostagem ?? []).join("\n"));
        setRevFotoUrls((prev) => {
          revokeBlobPhotoUrls(prev);
          return [...(initialEvent.completionPhotoDataUrls ?? [])];
        });
      } else {
        setRevFotoUrls((prev) => {
          revokeBlobPhotoUrls(prev);
          return [];
        });
        setLinksPostagemText("");
      }
    }
    const p = initialEvent.panfletosDistribuidos;
    const un = typeof p === "number" ? String(p) : "";
    setUnidadesPanfletos(un);
    setPanfletagemRealizada(!!un && Number.parseFloat(un) > 0);
  }, [open, initialEvent?.id, preferFinalizado]);

  React.useEffect(() => {
    if (pontoViciadoId) setPontoErro(false);
  }, [pontoViciadoId]);

  const pontoSelecionado = pontoViciadoId
    ? pontosVicioFormOptions.find((f) => f.id === pontoViciadoId)
    : undefined;
  const enderecoPonto = pontoSelecionado?.address?.trim() ?? "";
  const subprefeitura = pontoSelecionado?.subprefeitura?.trim() ?? "";

  const filteredPv = React.useMemo(() => {
    const q = pvSearch.trim().toLowerCase();
    if (!q) return [];
    return pontosVicioFormOptions.filter(
      (f) =>
        f.id.toLowerCase().includes(q) ||
        (f.address ?? "").toLowerCase().includes(q),
    );
  }, [pvSearch, pontosVicioFormOptions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "!flex w-[min(100vw-1rem,56rem)] max-w-4xl flex-col gap-0 overflow-hidden border-zinc-200/80 p-0 shadow-2xl sm:max-w-4xl dark:border-zinc-800",
          "max-h-[min(92vh,920px)]",
        )}
        showCloseButton
      >
        <ModalHero
          icon={RefreshCcw}
          title="Revitalização"
          description="Marque como agendada ou já finalizada; quantificação, links e fotos apenas ao encerrar o trabalho no local."
          accentClassName="from-blue-500/6 via-white to-violet-500/8 dark:via-zinc-900 dark:from-blue-950/40 dark:to-violet-950/30"
          iconWrapperClassName="bg-gradient-to-br from-blue-500 to-violet-600 shadow-blue-500/20"
        />
        <form
          className="flex min-h-0 flex-1 flex-col"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setSaveErrorRev(null);
            setPontoErro(false);
            if (!pontoViciadoId) {
              setPontoErro(true);
              scrollModalFormToTop(revitalizacaoFormScrollRef.current);
              return;
            }
            const vol = volumeRev.trim();
            const kg = kgRev.trim();
            const eq = equipeRev.trim();
            const title = `Revitalização — ${pontoViciadoId}`;
            const observationLines =
              situacaoRev === "agendar"
                ? [
                    `Ponto viciado: ${pontoViciadoId}`,
                    subprefeitura ? `Subprefeitura: ${subprefeitura}` : "",
                    `Data da revitalização: ${dataRevitalizacao}`,
                  ]
                : [
                    `Ponto viciado: ${pontoViciadoId}`,
                    subprefeitura ? `Subprefeitura: ${subprefeitura}` : "",
                    vol ? `Volume retirado: ${vol} m³` : "",
                    kg ? `Resíduos: ${kg} kg` : "",
                    eq ? `Equipe: ${eq} pessoa(s)` : "",
                    `Data da revitalização: ${dataRevitalizacao}`,
                  ];
            const structuredObs = observationLines.filter(Boolean).join("\n");
            const freeChunks: string[] = [];
            if (situacaoRev === "agendar") {
              if (descricaoFeitoRev.trim())
                freeChunks.push(`Previsto:\n${descricaoFeitoRev.trim()}`);
              if (observacoesGeraisRev.trim())
                freeChunks.push(observacoesGeraisRev.trim());
            } else if (observacoesGeraisRev.trim()) {
              freeChunks.push(observacoesGeraisRev.trim());
            }
            const observations = [structuredObs, ...freeChunks]
              .filter(Boolean)
              .join("\n\n");

            const status: AgendaEventStatus =
              situacaoRev === "agendar" ? "pendente" : "concluido";
            const clockTrim = horarioRev.trim();
            const clock =
              clockTrim !== "" ? clockTrim : AGENDA_TIME_UNSPECIFIED;

            let completionDescription: string | undefined;
            if (situacaoRev === "finalizado" && descricaoFeitoRev.trim()) {
              completionDescription = descricaoFeitoRev.trim();
            }

            const links = parseLinks(linksPostagemText);
            let panfletosDistribuidos: number | undefined;
            if (
              situacaoRev === "finalizado" &&
              panfletagemRealizada &&
              unidadesPanfletos.trim()
            ) {
              const parsed = Number.parseInt(unidadesPanfletos, 10);
              if (Number.isFinite(parsed) && parsed >= 0) {
                panfletosDistribuidos = parsed;
              }
            }

            const subFromSp = subregionalIdFromSubprefeitura(subprefeitura);
            const patch: Omit<AgendaEvent, "id"> = {
              title,
              type: "revitalizacao",
              status,
              responsible:
                firstNameForResponsible(user, profile?.nome) || "—",
              date: dataRevitalizacao,
              time: clock,
              endTime: clock,
              location: enderecoPonto || "—",
              ...(subFromSp ? { subregional: subFromSp } : {}),
              priority: "medium",
              observations,
              ...(completionDescription != null && completionDescription !== ""
                ? { completionDescription }
                : {}),
            };
            if (situacaoRev === "finalizado") {
              patch.linksPostagem = links;
              if (eq) patch.equipe = `${eq} pessoa(s)`;
              if (panfletosDistribuidos !== undefined)
                patch.panfletosDistribuidos = panfletosDistribuidos;
            } else {
              patch.linksPostagem = [];
            }

            setSavingRev(true);
            try {
              let targetId: number;
              if (initialEvent?.id != null) {
                targetId = initialEvent.id;
                const remote = await fetchAgendaEventByNumericId(targetId);
                if (remote) {
                  await updateAgendaEventFields(targetId, patch);
                } else {
                  await mergeWriteAgendaEvent({
                    ...initialEvent,
                    ...patch,
                    id: targetId,
                    createdByUid:
                      initialEvent.createdByUid ?? user?.uid,
                  });
                }
              } else {
                targetId = await createAgendaDocument({
                  ...patch,
                  ...(user?.uid ? { createdByUid: user.uid } : {}),
                });
              }
              if (
                situacaoRev === "finalizado" &&
                revFotoUrls.length > 0
              ) {
                const urls = await replaceDataUrlsWithStorage(
                  revFotoUrls,
                  `agenda/${targetId}/completion`,
                );
                if (urls?.length) {
                  await updateAgendaEventFields(targetId, {
                    completionPhotoDataUrls: urls,
                  });
                }
              }
              if (situacaoRev === "finalizado") {
                const fresh = await fetchAgendaEventByNumericId(targetId);
                if (fresh) await replaceHistoryFromCompletedAgendaEvent(fresh);
              }
              onOpenChange(false);
            } catch (err) {
              console.error(err);
              setSaveErrorRev("Não foi possível salvar. Tente de novo.");
            } finally {
              setSavingRev(false);
            }
          }}
        >
          <div
            ref={revitalizacaoFormScrollRef}
            className={cn(
              "agir-dialog-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain",
              "px-6 py-5 sm:px-10 sm:py-6",
            )}
          >
            <div className="space-y-5">
              {saveErrorRev && (
                <p className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {saveErrorRev}
                </p>
              )}
              {pontoErro && (
                <p className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  Selecione um ponto viciado antes de salvar.
                </p>
              )}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Situação
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSituacaoRev("agendar");
                      setLinksPostagemText("");
                      setRevFotoUrls((prev) => {
                        revokeBlobPhotoUrls(prev);
                        return [];
                      });
                    }}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                      situacaoRev === "agendar"
                        ? "border-blue-400/60 bg-blue-500/5 shadow-md dark:border-blue-500/50 dark:bg-blue-950/40"
                        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600",
                    )}
                  >
                    <Calendar className="h-10 w-10 shrink-0 rounded-xl bg-blue-600 p-2 text-white" />
                    <span>
                      <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                        Agendado
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                        Local, data e detalhes previstos; complete os
                        quantitativos ao finalizar no local.
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSituacaoRev("finalizado")}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                      situacaoRev === "finalizado"
                        ? "border-violet-400/60 bg-violet-500/6 shadow-md dark:border-violet-500/50 dark:bg-violet-950/40"
                        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600",
                    )}
                  >
                    <CheckCircle2 className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 p-2 text-white" />
                    <span>
                      <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                        Finalizado
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                        Registrar quantificação, fotos opcionais e links de divulgação.
                      </span>
                    </span>
                  </button>
                </div>
              </div>
              <input type="hidden" name="pontoViciadoId" value={pontoViciadoId} />
              <input
                type="hidden"
                name="subprefeituraPontoViciado"
                value={subprefeitura}
              />
              <SectionBox icon={MapPin} title="Ponto viciado (revitalização)">
                <div className={cn(fieldGrid(), "items-end gap-4")}>
                  <div className="space-y-2 sm:col-span-1">
                    <Label className="text-zinc-600 dark:text-zinc-400">
                      Ponto viciado
                      <RequiredStar />
                    </Label>
                    <Popover
                      open={pvComboOpen}
                      onOpenChange={(o) => {
                        setPvComboOpen(o);
                        if (o) setPvSearch("");
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          role="combobox"
                          variant="outline"
                          aria-expanded={pvComboOpen}
                          className={cn(
                            "h-11 w-full min-w-0 justify-between border-zinc-200 font-normal dark:border-zinc-700",
                            pontoErro &&
                              "border-red-300 ring-1 ring-red-200 dark:border-red-700 dark:ring-red-900",
                          )}
                        >
                          {pontoViciadoId ? (
                            <span className="truncate text-left text-zinc-800 dark:text-zinc-100">
                              {pontoViciadoId} — {enderecoPonto}
                            </span>
                          ) : (
                            <span className="text-zinc-500 dark:text-zinc-400">
                              Busque por ID ou endereço
                            </span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                        align="start"
                      >
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Digite ID ou endereço…"
                            className="h-11"
                            value={pvSearch}
                            onValueChange={setPvSearch}
                          />
                          <CommandList className="max-h-[min(50vh,320px)]">
                            <CommandEmpty>
                              {pvSearch.trim()
                                ? "Nenhum ponto encontrado."
                                : "Digite para filtrar — só aparecem resultados da busca."}
                            </CommandEmpty>
                            <CommandGroup>
                              {filteredPv.map((f) => {
                                const addr = f.address?.trim() ?? "";
                                return (
                                  <CommandItem
                                    key={f.id}
                                    value={f.id}
                                    keywords={[f.id, addr]}
                                    onSelect={() => {
                                      setPontoViciadoId(f.id);
                                      setPvSearch("");
                                      setPvComboOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4 shrink-0",
                                        pontoViciadoId === f.id
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    <span className="line-clamp-2 break-words">
                                      {f.id} — {addr}
                                    </span>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {!addingNewPonto && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-1.5 h-auto px-0 text-xs font-medium text-[var(--gradient-accent)] hover:text-[var(--gradient-accent)]/80 hover:bg-transparent"
                        onClick={() => setAddingNewPonto(true)}
                      >
                        <MapPin className="mr-1 h-3 w-3" />
                        Cadastrar novo ponto viciado
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 sm:col-span-1">
                    <Label
                      htmlFor="sub-rev"
                      className="text-zinc-600 dark:text-zinc-400"
                    >
                      Subprefeitura
                    </Label>
                    <Input
                      id="sub-rev"
                      name="subprefeituraDisplay"
                      value={subprefeitura}
                      readOnly
                      placeholder="Selecione um ponto viciado"
                      className="h-11 cursor-default border-zinc-200 bg-zinc-100/80 dark:border-zinc-700 dark:bg-zinc-800/50"
                    />
                    {subprefeitura ? (
                      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {(() => {
                          const id = subregionalIdFromSubprefeitura(subprefeitura);
                          return id ? (
                            <>
                              Nos Indicadores, contabiliza como{" "}
                              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                {subregionalMeta(id).label}
                              </span>
                              .
                            </>
                          ) : (
                            <>
                              Esta subprefeitura ainda não tem correspondência
                              automática nos Indicadores.
                            </>
                          );
                        })()}
                      </p>
                    ) : null}
                  </div>
                </div>

                {addingNewPonto && (
                  <div className="mt-4 space-y-3 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-violet-900">
                        Cadastrar novo ponto viciado
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-zinc-500 dark:text-zinc-400"
                        onClick={resetNewPontoForm}
                      >
                        Cancelar
                      </Button>
                    </div>
                    {newPontoError && (
                      <p className="rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                        {newPontoError}
                      </p>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-600 dark:text-zinc-400">
                          Código <RequiredStar />
                        </Label>
                        <Input
                          className="h-9 border-zinc-200 text-sm dark:border-zinc-700"
                          placeholder="Ex.: CV-001"
                          value={newPontoCodigo}
                          onChange={(e) => setNewPontoCodigo(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-600 dark:text-zinc-400">
                          Subprefeitura
                        </Label>
                        <Input
                          className="h-9 border-zinc-200 text-sm dark:border-zinc-700"
                          placeholder="Ex.: Capela do Socorro"
                          value={newPontoSubprefeitura}
                          onChange={(e) =>
                            setNewPontoSubprefeitura(e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-600 dark:text-zinc-400">
                        Buscar endereço
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          className="h-9 flex-1 border-zinc-200 text-sm dark:border-zinc-700"
                          placeholder="Rua, número, bairro…"
                          value={newPontoSearchQuery}
                          onChange={(e) =>
                            setNewPontoSearchQuery(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void handleNewPontoSearch();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0 rounded-lg"
                          disabled={newPontoSearching}
                          onClick={() => void handleNewPontoSearch()}
                        >
                          {newPontoSearching ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Search className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-600 dark:text-zinc-400">
                        Endereço
                      </Label>
                      <Input
                        className="h-9 border-zinc-200 text-sm dark:border-zinc-700"
                        placeholder="Preenchido pela busca ou clique no mapa"
                        value={newPontoAddress}
                        onChange={(e) => setNewPontoAddress(e.target.value)}
                      />
                    </div>
                    <ModalLocationMiniMap
                      className="!min-h-[180px]"
                      marker={
                        newPontoLat != null && newPontoLng != null
                          ? { lat: newPontoLat, lng: newPontoLng }
                          : null
                      }
                      flyTo={newPontoMapFlyTo}
                      onMapClick={handleNewPontoMapClick}
                    />
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Clique no mapa para ajustar a localização exata.
                    </p>
                    <Button
                      type="button"
                      className="h-9 w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-sm text-white hover:opacity-90"
                      disabled={newPontoSaving}
                      onClick={() => void handleSaveNewPonto()}
                    >
                      {newPontoSaving ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Salvando…
                        </>
                      ) : (
                        "Salvar ponto e selecionar"
                      )}
                    </Button>
                  </div>
                )}
              </SectionBox>

              <SectionBox icon={Calendar} title="Quando">
                <div className={fieldGrid()}>
                  <div className="space-y-2">
                    <Label htmlFor="data-revitalizacao" className="text-zinc-600 dark:text-zinc-400">
                      Data da revitalização
                      <RequiredStar />
                    </Label>
                    <DatePickerField
                      id="data-revitalizacao"
                      value={dataRevitalizacao}
                      onChange={setDataRevitalizacao}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rev-horario" className="text-zinc-600 dark:text-zinc-400">
                      Horário (opcional)
                    </Label>
                    <TimePickerField
                      id="rev-horario"
                      value={horarioRev}
                      onChange={setHorarioRev}
                    />
                  </div>
                </div>
              </SectionBox>

              <SectionBox
                icon={Briefcase}
                title={
                  situacaoRev === "agendar"
                    ? "Detalhes do agendamento"
                    : "Informações da revitalização concluída"
                }
              >
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rev-feito" className="text-zinc-600 dark:text-zinc-400">
                      {situacaoRev === "agendar"
                        ? "O que está previsto"
                        : "O que foi feito"}
                    </Label>
                    <Textarea
                      id="rev-feito"
                      name="oQueFoiFeito"
                      value={descricaoFeitoRev}
                      onChange={(e) => setDescricaoFeitoRev(e.target.value)}
                      placeholder={
                        situacaoRev === "agendar"
                          ? "Objetivo, materiais, encaminhamentos previstos…"
                          : "Resumo do trabalho realizado, etapas e resultados…"
                      }
                      className="min-h-[100px] resize-y border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rev-obs" className="text-zinc-600 dark:text-zinc-400">
                      Observações
                    </Label>
                    <Textarea
                      id="rev-obs"
                      name="observacoes"
                      value={observacoesGeraisRev}
                      onChange={(e) => setObservacoesGeraisRev(e.target.value)}
                      placeholder="Notas, pendências, próximos passos…"
                      className="min-h-[88px] resize-y border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                </div>
              </SectionBox>

              {situacaoRev === "finalizado" && (
                <>
                  <SectionBox icon={Layers} title="Quantitativos">
                    <div className={cn(fieldGrid(), "gap-4")}>
                      <div className="space-y-2">
                        <Label
                          htmlFor="q-volume"
                          className="text-zinc-600 dark:text-zinc-400"
                        >
                          Volume retirado (m³)
                        </Label>
                        <Input
                          id="q-volume"
                          name="volumeM3"
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0"
                          className="h-11 border-zinc-200 dark:border-zinc-700"
                          value={volumeRev}
                          onChange={(e) => setVolumeRev(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="q-kg"
                          className="text-zinc-600 dark:text-zinc-400"
                        >
                          Resíduos (kg)
                        </Label>
                        <Input
                          id="q-kg"
                          name="residuosKg"
                          type="number"
                          min={0}
                          step="0.1"
                          placeholder="0"
                          className="h-11 border-zinc-200 dark:border-zinc-700"
                          value={kgRev}
                          onChange={(e) => setKgRev(e.target.value)}
                        />
                      </div>
                    </div>
                  </SectionBox>

                  <SectionBox icon={Users} title="Equipe">
                    <div className="space-y-2">
                      <Label
                        htmlFor="eq-num"
                        className="text-zinc-600 dark:text-zinc-400"
                      >
                        Número de pessoas
                      </Label>
                      <Input
                        id="eq-num"
                        name="equipeNum"
                        type="number"
                        min={1}
                        placeholder="0"
                        className="h-11 max-w-xs border-zinc-200 dark:border-zinc-700"
                        value={equipeRev}
                        onChange={(e) => setEquipeRev(e.target.value)}
                      />
                    </div>
                  </SectionBox>

                  <div className="flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6 dark:border-zinc-800 dark:bg-zinc-800/50">
                    <div className="space-y-2">
                      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        <Megaphone className="h-4 w-4 text-blue-600" />
                        Panfletagem
                      </div>
                      <Label
                        htmlFor="panf-q"
                        className="text-zinc-600 dark:text-zinc-400"
                      >
                        Unidades distribuídas
                      </Label>
                      {!panfletagemRealizada ? (
                        <input
                          type="hidden"
                          name="panfletos"
                          value="0"
                        />
                      ) : null}
                      <Input
                        id="panf-q"
                        name={
                          panfletagemRealizada ? "panfletos" : undefined
                        }
                        type="number"
                        min={0}
                        placeholder="0"
                        className="h-11 w-44 border-zinc-200 dark:border-zinc-700"
                        value={unidadesPanfletos}
                        onChange={(e) =>
                          setUnidadesPanfletos(
                            panfletagemRealizada ? e.target.value : "",
                          )
                        }
                        disabled={!panfletagemRealizada}
                      />
                    </div>
                    <div className="flex items-center gap-2.5 rounded-xl bg-white dark:bg-zinc-900 px-3 py-2.5 ring-1 ring-zinc-200 dark:ring-zinc-700">
                      <input
                        type="hidden"
                        name="panfletagemFeita"
                        value={
                          panfletagemRealizada ? "on" : "off"
                        }
                      />
                      <Checkbox
                        id="panf-feita"
                        checked={panfletagemRealizada}
                        onCheckedChange={(c) => {
                          const on = c === true;
                          setPanfletagemRealizada(on);
                          if (!on) setUnidadesPanfletos("");
                        }}
                      />
                      <Label
                        htmlFor="panf-feita"
                        className="cursor-pointer text-sm font-medium leading-tight text-zinc-700 dark:text-zinc-300"
                      >
                        Panfletagem realizada
                      </Label>
                    </div>
                  </div>

                  <LinksPostagemEditor
                    id="rev-links-postagem"
                    name="linksPostagem"
                    value={linksPostagemText}
                    onChange={setLinksPostagemText}
                    hint="Um link por linha. No histórico e na agenda, cada URL aparece como atalho com ícone de abrir em nova página."
                    textareaClassName="bg-white dark:bg-zinc-900"
                  />

                  <ActionPhotoDropzone
                    photoDataUrls={revFotoUrls}
                    onChange={setRevFotoUrls}
                    variant="emphasis"
                    label="Fotos ou vídeo (opcional)"
                    hint="Clique ou arraste imagens ou vídeo — antes, durante e depois"
                    highlightAntesDepoisPair
                    orderHint="As duas primeiras fotos nesta ordem aparecem como Antes e Depois na galeria. Arraste as miniaturas para reordenar."
                  />
                </>
              )}
            </div>
          </div>
          <Separator className="shrink-0" />
          <DialogFooter className="shrink-0 gap-2 bg-zinc-50/40 p-4 sm:justify-end sm:px-10 sm:py-5 dark:bg-zinc-900/60">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              disabled={savingRev}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={savingRev}
              className="h-11 rounded-xl bg-accent-gradient text-white"
            >
              {savingRev ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                  Salvando…
                </>
              ) : situacaoRev === "agendar" ? (
                "Salvar agendamento"
              ) : (
                "Salvar revitalização"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NovaAcaoModals({
  ui,
  onUiClose,
}: {
  ui: NovaAcaoUIMode;
  onUiClose: () => void;
}) {
  const { getEvent } = useAgendaEvents();
  const [editSnap, setEditSnap] = React.useState<
    AgendaEvent | null | undefined
  >(undefined);

  React.useEffect(() => {
    if (ui.kind !== "edit") {
      setEditSnap(undefined);
      return;
    }
    const cached = getEvent(ui.id);
    if (cached) {
      setEditSnap(cached);
      return;
    }
    let cancelled = false;
    setEditSnap(undefined);
    void fetchAgendaEventByNumericId(ui.id).then((d) => {
      if (cancelled) return;
      if (d) {
        setEditSnap(d);
        return;
      }
      if (ui.kind === "edit" && ui.historyFallbackAgenda) {
        setEditSnap(ui.historyFallbackAgenda);
        return;
      }
      setEditSnap(null);
      onUiClose();
    });
    return () => {
      cancelled = true;
    };
  }, [ui, getEvent, onUiClose]);

  const ready = ui.kind !== "edit" || editSnap !== undefined;
  const showAcaoVisit =
    ready &&
    (ui.kind === "nova"
      ? ui.tipo === "acao-visita"
      : !!editSnap && editSnap.type !== "revitalizacao");
  const showRevitaliza =
    ready &&
    (ui.kind === "nova"
      ? ui.tipo === "revitalizacao"
      : !!editSnap && editSnap.type === "revitalizacao");

  const initialAcao =
    ui.kind === "edit" &&
    editSnap &&
    editSnap.type !== "revitalizacao"
      ? editSnap
      : null;
  const initialRev =
    ui.kind === "edit" &&
    editSnap &&
    editSnap.type === "revitalizacao"
      ? editSnap
      : null;

  const openAsFinalizado =
    ui.kind === "edit" && !!ui.openAsFinalizado;

  return (
    <>
      <AcaoVisitaDialog
        open={showAcaoVisit}
        onOpenChange={(o) => {
          if (!o) onUiClose();
        }}
        initialEvent={initialAcao}
        preferFinalizado={openAsFinalizado}
      />
      <RevitalizacaoDialog
        open={showRevitaliza}
        onOpenChange={(o) => {
          if (!o) onUiClose();
        }}
        initialEvent={initialRev}
        preferFinalizado={openAsFinalizado}
      />
    </>
  );
}

export function NovaAcaoProvider({ children }: { children: React.ReactNode }) {
  const [ui, setUi] = React.useState<NovaAcaoUIMode>({ kind: "none" });

  const legacyOpen = ui.kind === "nova" ? ui.tipo : null;

  const value = React.useMemo<NovaAcaoContextValue>(
    () => ({
      mode: ui,
      open: legacyOpen,
      openModal: (t) => setUi({ kind: "nova", tipo: t }),
      openAgendaEventForEdit: (id, opts) =>
        setUi({
          kind: "edit",
          id,
          ...(opts?.openAsFinalizado ? { openAsFinalizado: true } : {}),
        }),
      openHistoryRecordForEdit: (record) =>
        setUi({
          kind: "edit",
          id: record.id,
          openAsFinalizado:
            record.status === "concluido" || record.status === "parcial",
          historyFallbackAgenda: historyRecordDocToAgendaEvent(record),
        }),
      close: () => setUi({ kind: "none" }),
    }),
    [ui],
  );

  return (
    <NovaAcaoContext.Provider value={value}>
      {children}
      <NovaAcaoModals ui={ui} onUiClose={() => setUi({ kind: "none" })} />
    </NovaAcaoContext.Provider>
  );
}
