"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Share2,
  Lightbulb,
  FileEdit,
  CalendarClock,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import {
  SocialMediaDropzone,
  type SocialConteudoMediaItem,
} from "@/components/redes-sociais/social-media-dropzone";
import { DatePickerField } from "@/components/forms/date-picker-field";
import { TimePickerField } from "@/components/forms/time-picker-field";
import { useSocialPosts } from "@/contexts/social-posts-context";
import { useAuth } from "@/contexts/auth-context";
import { useUserProfile } from "@/contexts/user-profile-context";
import { firstNameForResponsible } from "@/lib/auth/responsible-default";
import { uploadFileToPath } from "@/lib/storage/upload-helpers";
import type {
  SocialContentStatus,
  SocialContentTipo,
  SocialPost,
  SocialPublicationRede,
} from "@/data/social-posts";
import { SOCIAL_PUBLICATION_REDE_LABELS } from "@/data/social-posts";
import { SocialRedeFaIcon } from "@/components/redes-sociais/social-rede-fa-icon";

export type ConteudoStatusFase = SocialContentStatus;

/** Compatibilidade — persistência passou para Firestore via useSocialPosts. */
export type PersistSocialPostFn = (post: SocialPost) => void;

export function registerSocialConteudoPersist(
  fn: PersistSocialPostFn | null,
) {
  void fn;
}

let allocateNextSocialPostIdFn: () => number = () =>
  -Math.floor(Date.now() % 1e9);

export function registerAllocateNextSocialPostId(fn: () => number) {
  allocateNextSocialPostIdFn = fn;
}

export type ConteudoModalCtxValue = {
  /** Novo conteúdo — mesmo comportamento da antiga API `open()`. */
  openCreate: () => void;
  open: () => void;
  openEdit: (post: SocialPost) => void;
  close: () => void;
  isOpen: boolean;
};

const Ctx = React.createContext<ConteudoModalCtxValue | null>(null);

export function useConteudoSocialModal() {
  const v = React.useContext(Ctx);
  if (!v) {
    throw new Error(
      "useConteudoSocialModal deve estar dentro de ConteudoSocialModalProvider",
    );
  }
  return v;
}

const STATUS_OPTIONS: {
  value: ConteudoStatusFase;
  label: string;
  hint: string;
}[] = [
  {
    value: "ideia",
    label: "Ideia",
    hint: "",
  },
  {
    value: "rascunho",
    label: "Rascunho",
    hint: "Material em elaboração",
  },
  {
    value: "agendado",
    label: "Agendado",
    hint: "Pauta com data/hora de publicação",
  },
  {
    value: "publicado",
    label: "Publicado",
    hint: "Já no ar — data/hora e link do post",
  },
];

const TIPOS: SocialContentTipo[] = ["Post", "Reel", "Story"];

const REDES_PUBLICACAO: SocialPublicationRede[] = [
  "facebook",
  "instagram",
  "linkedin",
];

const MAX_SOCIAL_MEDIA_TOTAL = 18;

function isExistingSocialPhotoVideo(photo: SocialPost["fotos"][number]): boolean {
  if (photo.type === "video") return true;
  const u = photo.url?.toLowerCase() ?? "";
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);
}

function ModalHeroHeader({ mode }: { mode: "create" | "edit" }) {
  const edit = mode === "edit";
  return (
    <div className="shrink-0 border-b border-zinc-100/80 bg-gradient-to-br from-fuchsia-500/8 via-white to-violet-500/10 px-6 py-5 dark:border-zinc-800 dark:via-zinc-900 sm:px-10 sm:py-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-gradient-br text-white shadow-lg shadow-[var(--gradient-start)]/20">
          <Share2 className="h-6 w-6" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <DialogTitle className="text-left text-xl font-semibold tracking-tight">
            {edit ? "Editar conteúdo" : "Novo conteúdo"}
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-zinc-600 dark:text-zinc-400">
            {edit
              ? "Atualize a fase, o texto e as mídias. Mudanças serão gravadas onde o app registrar os dados."
              : "Redes sociais — defina a fase, o formato e anexe mídias. Campos extras aparecem conforme o status."}
          </DialogDescription>
        </div>
      </div>
    </div>
  );
}

const FASE_ICONS: Record<
  ConteudoStatusFase,
  React.ComponentType<{ className?: string }>
> = {
  ideia: Lightbulb,
  rascunho: FileEdit,
  agendado: CalendarClock,
  publicado: CheckCircle2,
};

/** Converte modelo de card ↔ estado do formulário (ISO yyyy-MM-dd). */
function hydrateFormFromPost(post: SocialPost) {
  const dateRaw =
    post.date && post.date !== "—" && /^\d{4}-\d{2}-\d{2}$/.test(post.date)
      ? post.date
      : "";

  let dataPauta = "";
  const horaPauta = "";
  let dataPublicacao = "";
  const horaPublicacao = "";

  switch (post.status) {
    case "agendado":
      dataPauta = dateRaw;
      break;
    case "publicado":
      dataPublicacao = dateRaw;
      break;
    default:
      break;
  }

  return {
    fase: post.status,
    tema: post.tema,
    tipo: post.tipo,
    responsavel: post.responsavel,
    ideiaTexto: post.ideiaResumo ?? "",
    legenda: post.legenda ?? "",
    linkArquivo: post.linkOuArquivo ?? "",
    linkPost: post.linkPost ?? "",
    dataPauta,
    horaPauta,
    dataPublicacao,
    horaPublicacao,
    notas: post.notasProducao ?? "",
    redePublicacao: post.redePublicacao
      ? Array.isArray(post.redePublicacao)
        ? post.redePublicacao
        : [post.redePublicacao]
      : undefined,
  };
}

type FormDraft = ReturnType<typeof hydrateFormFromPost>;

export function mergeFormIntoSocialPost(
  editingPost: SocialPost | null,
  draft: FormDraft,
): SocialPost {
  const { fase, tema, tipo, responsavel, ideiaTexto, legenda } = draft;
  const redeVal = draft.redePublicacao && draft.redePublicacao.length > 0
    ? draft.redePublicacao
    : undefined;
  const arquivoUrl = draft.linkArquivo.trim();
  const linkPostVal = draft.linkPost.trim();

  let dateOut: string;
  if (fase === "agendado" && draft.dataPauta) dateOut = draft.dataPauta;
  else if (fase === "publicado" && draft.dataPublicacao)
    dateOut = draft.dataPublicacao;
  else if (fase === "ideia") dateOut = "—";
  else if (editingPost?.date && editingPost.date !== "—") dateOut = editingPost.date;
  else dateOut = "—";

  const id = editingPost?.id ?? allocateNextSocialPostIdFn();
  const prev = editingPost;
  const fotos = prev?.fotos ?? [];

  const linkOuArquivoVal: string | null =
    arquivoUrl.length > 0 ? arquivoUrl : null;
  const linkOuArquivoLabel =
    fase === "rascunho" && linkOuArquivoVal
      ? (prev?.linkOuArquivoLabel ?? "Arquivo / link de apoio")
      : prev?.linkOuArquivoLabel;

  const preserveMetrics =
    prev?.status === "publicado" && fase === "publicado";

  const partial: Omit<
    SocialPost,
    | "visualizacoes"
    | "curtidas"
    | "compartilhamentos"
    | "metricasAtualizadasEm"
    | "linkPost"
  > & {
    visualizacoes?: number;
    curtidas?: number;
    compartilhamentos?: number;
    metricasAtualizadasEm?: string;
  } = {
    id,
    createdAtMs: editingPost?.createdAtMs ?? Date.now(),
    createdByUid: editingPost?.createdByUid,
    status: fase,
    date: dateOut,
    tema,
    tipo,
    responsavel,
    fotos,
    legenda:
      fase === "ideia"
        ? undefined
        : legenda.trim().length > 0
          ? legenda
          : prev?.legenda,
    ideiaResumo: fase === "ideia"
      ? (ideiaTexto.trim().length ? ideiaTexto : undefined)
      : undefined,
    notasProducao: draft.notas.trim().length ? draft.notas.trim() : undefined,
    linkOuArquivo: fase === "ideia" ? null : linkOuArquivoVal,
    linkOuArquivoLabel:
      fase === "ideia" || !linkOuArquivoVal ? undefined : linkOuArquivoLabel,
    ...(fase === "publicado" && redeVal
      ? { redePublicacao: redeVal }
      : {}),
  };

  if (fase === "publicado") {
    return {
      ...partial,
      linkPost: linkPostVal.length > 0 ? linkPostVal : prev?.linkPost,
      ...(preserveMetrics
        ? {
            visualizacoes: prev.visualizacoes,
            curtidas: prev.curtidas,
            compartilhamentos: prev.compartilhamentos,
            metricasAtualizadasEm: prev.metricasAtualizadasEm,
          }
        : {}),
    };
  }

  return partial;
}

async function appendUploadedMediaToFotos(
  postId: number,
  prevFotos: SocialPost["fotos"],
  media: SocialConteudoMediaItem[],
): Promise<SocialPost["fotos"]> {
  if (media.length === 0) return prevFotos;
  let maxId = prevFotos.length ? Math.max(...prevFotos.map((f) => f.id)) : 0;
  const out = [...prevFotos];
  for (const m of media) {
    maxId += 1;
    const safeName = m.file.name.replace(/[^\w.-]/g, "_").slice(0, 80);
    const path = `social/${postId}/${crypto.randomUUID()}-${safeName}`;
    const url = await uploadFileToPath(path, m.file);
    out.push({
      id: maxId,
      color: "bg-zinc-200",
      url,
      type: m.file.type.startsWith("video/") ? "video" : "image",
    });
  }
  return out;
}

export function ConteudoSocialModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [editingPost, setEditingPost] = React.useState<SocialPost | null>(null);

  const mode: "create" | "edit" = editingPost ? "edit" : "create";

  const close = React.useCallback(() => setOpen(false), []);

  const openCreate = React.useCallback(() => {
    setEditingPost(null);
    setOpen(true);
  }, []);

  const openEdit = React.useCallback((post: SocialPost) => {
    setEditingPost(post);
    setOpen(true);
  }, []);

  const ctx = React.useMemo(
    (): ConteudoModalCtxValue => ({
      openCreate,
      open: openCreate,
      openEdit,
      close,
      isOpen: open,
    }),
    [open, openCreate, openEdit, close],
  );

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <ConteudoFormDialog
        open={open}
        editingPost={editingPost}
        mode={mode}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditingPost(null);
        }}
      />
    </Ctx.Provider>
  );
}

function ConteudoFormDialog({
  open,
  editingPost,
  mode,
  onOpenChange,
}: {
  open: boolean;
  editingPost: SocialPost | null;
  mode: "create" | "edit";
  onOpenChange: (o: boolean) => void;
}) {
  const { persistPost } = useSocialPosts();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [fase, setFase] = React.useState<ConteudoStatusFase>("ideia");
  const [tema, setTema] = React.useState("");
  const [tipo, setTipo] = React.useState<SocialContentTipo>("Post");
  const [responsavel, setResponsavel] = React.useState("");
  const [ideiaTexto, setIdeiaTexto] = React.useState("");
  const [legenda, setLegenda] = React.useState("");
  const [linkArquivo, setLinkArquivo] = React.useState("");
  const [linkPost, setLinkPost] = React.useState("");
  const [dataPauta, setDataPauta] = React.useState("");
  const [horaPauta, setHoraPauta] = React.useState("");
  const [dataPublicacao, setDataPublicacao] = React.useState("");
  const [horaPublicacao, setHoraPublicacao] = React.useState("");
  const [notas, setNotas] = React.useState("");
  const [redePublicacao, setRedePublicacao] = React.useState<
    SocialPublicationRede[]
  >([]);
  const [media, setMedia] = React.useState<SocialConteudoMediaItem[]>([]);
  const [removedExistingPhotoIds, setRemovedExistingPhotoIds] = React.useState<
    number[]
  >([]);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [camposDataErro, setCamposDataErro] = React.useState(false);

  /* Sincronizar estado do formulário com props ao abrir — padrão de diálogo controlado. */
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (!open) return;
    setMedia((prev) => {
      for (const m of prev) URL.revokeObjectURL(m.preview);
      return [];
    });

    if (editingPost) {
      setRemovedExistingPhotoIds([]);
      const h = hydrateFormFromPost(editingPost);
      setFase(h.fase);
      setTema(h.tema);
      setTipo(h.tipo);
      setResponsavel(h.responsavel);
      setIdeiaTexto(h.ideiaTexto);
      setLegenda(h.legenda);
      setLinkArquivo(h.linkArquivo);
      setLinkPost(h.linkPost);
      setDataPauta(h.dataPauta);
      setHoraPauta(h.horaPauta);
      setDataPublicacao(h.dataPublicacao);
      setHoraPublicacao(h.horaPublicacao);
      setNotas(h.notas);
      setRedePublicacao(
        h.redePublicacao
          ? Array.isArray(h.redePublicacao)
            ? h.redePublicacao
            : [h.redePublicacao]
          : [],
      );
      setCamposDataErro(false);
      return;
    }

    setRemovedExistingPhotoIds([]);
    setFase("ideia");
    setTema("");
    setTipo("Post");
    setResponsavel("");
    setIdeiaTexto("");
    setLegenda("");
    setLinkArquivo("");
    setLinkPost("");
    setDataPauta("");
    setHoraPauta("");
    setDataPublicacao("");
    setHoraPublicacao("");
    setNotas("");
    setRedePublicacao([]);
    setSubmitError(null);
    setSubmitting(false);
    setCamposDataErro(false);
  }, [open, editingPost]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    setCamposDataErro(false);
    if (fase === "agendado" && !dataPauta.trim()) {
      setCamposDataErro(true);
      setSubmitError("Informe a data da publicação agendada.");
      return;
    }
    if (fase === "publicado" && !dataPublicacao.trim()) {
      setCamposDataErro(true);
      setSubmitError("Informe a data da publicação.");
      return;
    }
    if (fase === "publicado" && redePublicacao.length === 0) {
      setSubmitError("Selecione ao menos uma rede onde o conteúdo foi publicado.");
      return;
    }
    setSubmitting(true);

    const draft = {
      fase,
      tema,
      tipo,
      responsavel:
        responsavel.trim() ||
        firstNameForResponsible(user, profile?.nome) ||
        "—",
      ideiaTexto,
      legenda,
      linkArquivo,
      linkPost,
      dataPauta,
      horaPauta,
      dataPublicacao,
      horaPublicacao,
      notas,
      redePublicacao:
        fase === "publicado" && redePublicacao.length > 0
          ? redePublicacao
          : undefined,
    };

    try {
      let merged = mergeFormIntoSocialPost(editingPost, draft);
      if (user?.uid) {
        merged = {
          ...merged,
          createdByUid: editingPost?.createdByUid ?? user.uid,
        };
      }
      const removed = new Set(removedExistingPhotoIds);
      const fotosAfterRemovals = merged.fotos.filter((f) => !removed.has(f.id));
      merged = { ...merged, fotos: fotosAfterRemovals };
      if (media.length > 0) {
        const fotos = await appendUploadedMediaToFotos(
          merged.id,
          merged.fotos,
          media,
        );
        merged = { ...merged, fotos };
        for (const m of media) URL.revokeObjectURL(m.preview);
        setMedia([]);
      }
      await persistPost(merged);
      onOpenChange(false);
    } catch (err) {
      console.error("[redes-sociais submit]", err);
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível salvar. Tente de novo.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const PhaseIcon = FASE_ICONS[fase];

  const existingPhotosVisible =
    mode === "edit"
      ? (editingPost?.fotos ?? []).filter(
          (f) => !removedExistingPhotoIds.includes(f.id),
        )
      : [];

  const keptExistingCount = existingPhotosVisible.length;
  const dropzoneMaxNew = Math.max(0, MAX_SOCIAL_MEDIA_TOTAL - keptExistingCount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "!flex w-[min(100vw-1rem,56rem)] max-w-4xl flex-col gap-0 overflow-hidden border-zinc-200/80 p-0 shadow-2xl dark:border-zinc-800 sm:max-w-4xl",
          "max-h-[min(92vh,920px)]",
        )}
        showCloseButton
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {mode === "edit" ? "Editar conteúdo — Redes sociais" : "Novo conteúdo — Redes sociais"}
          </DialogTitle>
        </DialogHeader>
        <ModalHeroHeader mode={mode} />
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div
            className={cn(
              "agir-dialog-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain",
              "px-6 py-5 sm:px-10 sm:py-6",
            )}
          >
            <div className="space-y-5">
              {submitError && (
                <p className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {submitError}
                </p>
              )}
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-800/50 sm:p-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  <PhaseIcon className="h-4 w-4 text-[var(--gradient-accent)]" />
                  Fase do conteúdo
                </div>
                <Label className="sr-only" htmlFor="fase-conteudo">
                  Status
                </Label>
                <Select
                  value={fase}
                  onValueChange={(v) => {
                    const next = v as ConteudoStatusFase;
                    setFase(next);
                    setCamposDataErro(false);
                    if (next !== "publicado") setRedePublicacao([]);
                  }}
                >
                  <SelectTrigger
                    id="fase-conteudo"
                    className="h-11 w-full min-w-0 border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <SelectValue placeholder="Fase" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs text-zinc-500">
                  {STATUS_OPTIONS.find((o) => o.value === fase)?.hint}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="tema">Tema / título</Label>
                  <Input
                    id="tema"
                    className="h-11 w-full min-w-0 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900"
                    value={tema}
                    onChange={(e) => setTema(e.target.value)}
                    required
                    placeholder="Ex.: dicas de descarte no ecoponto"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select
                    value={tipo}
                    onValueChange={(v) =>
                      setTipo(v as SocialContentTipo)
                    }
                  >
                    <SelectTrigger className="h-11 w-full min-w-0 border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {fase === "publicado" ? (
                  <div className="space-y-2">
                    <Label>Redes (publicação)</Label>
                    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                      {REDES_PUBLICACAO.map((r) => {
                        const checked = redePublicacao.includes(r);
                        return (
                          <label
                            key={r}
                            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                setRedePublicacao((prev) =>
                                  v
                                    ? [...prev, r]
                                    : prev.filter((x) => x !== r),
                                );
                              }}
                            />
                            <SocialRedeFaIcon
                              rede={r}
                              className="w-4 text-center text-base leading-none"
                            />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              {SOCIAL_PUBLICATION_REDE_LABELS[r]}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="hidden sm:block" aria-hidden />
                )}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="resp">Responsável</Label>
                  <Input
                    id="resp"
                    className="h-11 w-full min-w-0 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    placeholder="Nome"
                  />
                </div>
              </div>

              {fase === "agendado" && (
                <div className="rounded-2xl border-2 border-amber-200/60 bg-amber-50/40 p-4 dark:border-amber-800/50 dark:bg-amber-950/30 sm:p-5">
                  <p className="mb-3 text-sm font-semibold text-amber-950 dark:text-amber-100">
                    Publicação agendada
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="data-pauta" className="text-zinc-600">
                        Data
                      </Label>
                      <DatePickerField
                        id="data-pauta"
                        value={dataPauta}
                        onChange={(v) => {
                          setDataPauta(v);
                          setCamposDataErro(false);
                        }}
                        invalid={camposDataErro && !dataPauta.trim()}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hora-pauta" className="text-zinc-600">
                        Horário (opcional)
                      </Label>
                      <TimePickerField
                        id="hora-pauta"
                        value={horaPauta}
                        onChange={setHoraPauta}
                      />
                    </div>
                  </div>
                </div>
              )}

              {fase === "publicado" && (
                <div className="rounded-2xl border-2 border-emerald-200/60 bg-emerald-50/40 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/30 sm:p-5">
                  <p className="mb-3 text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                    Registro da publicação
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="data-pub" className="text-zinc-600">
                        Data da publicação
                      </Label>
                      <DatePickerField
                        id="data-pub"
                        value={dataPublicacao}
                        onChange={(v) => {
                          setDataPublicacao(v);
                          setCamposDataErro(false);
                        }}
                        invalid={camposDataErro && !dataPublicacao.trim()}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hora-pub" className="text-zinc-600">
                        Horário (opcional)
                      </Label>
                      <TimePickerField
                        id="hora-pub"
                        value={horaPublicacao}
                        onChange={setHoraPublicacao}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="link-post">Link do post</Label>
                      <Input
                        id="link-post"
                        className="h-11 w-full min-w-0 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900"
                        value={linkPost}
                        onChange={(e) => setLinkPost(e.target.value)}
                        type="url"
                        placeholder="https://instagram.com/..."
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {fase === "ideia" && (
                <div className="space-y-2">
                  <Label htmlFor="ideia">Ideia e referências</Label>
                  <Textarea
                    id="ideia"
                    className="min-h-[100px] resize-y border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900"
                    value={ideiaTexto}
                    onChange={(e) => setIdeiaTexto(e.target.value)}
                    placeholder="Conceito, referências, público-alvo, duração sugerida…"
                  />
                </div>
              )}

              {(fase === "rascunho" || fase === "agendado" || fase === "publicado") && (
                <div className="space-y-2">
                  <Label htmlFor="legenda">Legenda / texto (rascunho)</Label>
                  <Textarea
                    id="legenda"
                    className="min-h-[88px] resize-y border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900"
                    value={legenda}
                    onChange={(e) => setLegenda(e.target.value)}
                    placeholder="Rascunho de legenda ou roteiro…"
                  />
                </div>
              )}

              {fase === "rascunho" && (
                <div className="space-y-2">
                  <Label htmlFor="link-arq">Arquivo / link de apoio (opcional)</Label>
                  <Input
                    id="link-arq"
                    className="h-11 w-full min-w-0 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900"
                    value={linkArquivo}
                    onChange={(e) => setLinkArquivo(e.target.value)}
                    type="url"
                    placeholder="PDF, planilha, pasta…"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notas">Observações (opcional)</Label>
                <Textarea
                  id="notas"
                  className="min-h-[72px] resize-y border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Equipe, produção, pendências legais…"
                />
              </div>

              {existingPhotosVisible.length > 0 && (
                <div className="space-y-2">
                  <Label>Mídias já enviadas</Label>
                  <p className="text-xs text-zinc-500">
                    Remova as que não devem permanecer ou adicione novas abaixo.
                  </p>
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {existingPhotosVisible.map((photo) => {
                      const isVideo = isExistingSocialPhotoVideo(photo);
                      return (
                        <li
                          key={photo.id}
                          className={cn(
                            "group relative aspect-square overflow-hidden rounded-lg border border-zinc-100 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800",
                            !photo.url && photo.color,
                          )}
                        >
                          {photo.url && !isVideo && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photo.url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                          {photo.url && isVideo && (
                            <video
                              src={photo.url}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          )}
                          {!photo.url && (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-500">
                              Sem pré-visualização
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="absolute right-1 top-1 z-10 h-7 w-7 rounded-md border-0 bg-black/55 text-white opacity-0 shadow-md transition hover:bg-red-600 hover:text-white group-hover:opacity-100"
                            onClick={() =>
                              setRemovedExistingPhotoIds((prev) =>
                                prev.includes(photo.id) ? prev : [...prev, photo.id],
                              )
                            }
                            aria-label="Remover mídia guardada"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <SocialMediaDropzone
                items={media}
                onChange={setMedia}
                maxItems={dropzoneMaxNew}
                label="Adicionar mídias"
                hint="Clique ou arraste imagens e vídeos para esta área"
              />
            </div>
          </div>
          <Separator className="shrink-0" />
          <DialogFooter className="shrink-0 gap-2 p-4 sm:justify-end sm:px-10 sm:py-5">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-11 rounded-xl bg-accent-gradient text-white"
            >
              {submitting
                ? "Salvando…"
                : mode === "edit"
                  ? "Salvar alterações"
                  : "Salvar conteúdo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
