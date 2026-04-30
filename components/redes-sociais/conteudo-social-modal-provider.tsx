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
import { cn } from "@/lib/utils";
import {
  Share2,
  Lightbulb,
  FileEdit,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import {
  SocialMediaDropzone,
  type SocialConteudoMediaItem,
} from "@/components/redes-sociais/social-media-dropzone";
import { useSocialPosts } from "@/contexts/social-posts-context";
import { useAuth } from "@/contexts/auth-context";
import { useUserProfile } from "@/contexts/user-profile-context";
import { firstNameForResponsible } from "@/lib/auth/responsible-default";
import { uploadFileToPath } from "@/lib/storage/upload-helpers";
import type {
  SocialContentStatus,
  SocialContentTipo,
  SocialPost,
} from "@/data/social-posts";

export type ConteudoStatusFase = SocialContentStatus;

/** Compatibilidade — persistência passou para Firestore via useSocialPosts. */
export type PersistSocialPostFn = (post: SocialPost) => void;

export function registerSocialConteudoPersist(
  _: PersistSocialPostFn | null,
) {}

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
    hint: "Só planejamento — ainda sem peça",
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

function ModalHeroHeader({ mode }: { mode: "create" | "edit" }) {
  const edit = mode === "edit";
  return (
    <div className="shrink-0 border-b border-zinc-100/80 bg-gradient-to-br from-fuchsia-500/8 via-white to-violet-500/10 px-6 py-5 sm:px-10 sm:py-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f318e3] to-[#6a0eaf] text-white shadow-lg shadow-[#f318e3]/20">
          <Share2 className="h-6 w-6" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <DialogTitle className="text-left text-xl font-semibold tracking-tight">
            {edit ? "Editar conteúdo" : "Novo conteúdo"}
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-zinc-600">
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
  };
}

type FormDraft = ReturnType<typeof hydrateFormFromPost>;

export function mergeFormIntoSocialPost(
  editingPost: SocialPost | null,
  draft: FormDraft,
): SocialPost {
  const { fase, tema, tipo, responsavel, ideiaTexto, legenda } = draft;
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
  const [media, setMedia] = React.useState<SocialConteudoMediaItem[]>([]);

  /* Sincronizar estado do formulário com props ao abrir — padrão de diálogo controlado. */
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (!open) return;
    setMedia((prev) => {
      for (const m of prev) URL.revokeObjectURL(m.preview);
      return [];
    });

    if (editingPost) {
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
      return;
    }

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
  }, [open, editingPost]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
    };

    let merged = mergeFormIntoSocialPost(editingPost, draft);
    if (media.length > 0) {
      try {
        const fotos = await appendUploadedMediaToFotos(
          merged.id,
          merged.fotos,
          media,
        );
        merged = { ...merged, fotos };
      } finally {
        for (const m of media) URL.revokeObjectURL(m.preview);
        setMedia([]);
      }
    }
    await persistPost(merged);
    onOpenChange(false);
  };

  const PhaseIcon = FASE_ICONS[fase];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "!flex w-[min(100vw-1rem,56rem)] max-w-4xl flex-col gap-0 overflow-hidden border-zinc-200/80 p-0 shadow-2xl sm:max-w-4xl",
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
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4 sm:p-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-800">
                  <PhaseIcon className="h-4 w-4 text-[#9b0ba6]" />
                  Fase do conteúdo
                </div>
                <Label className="sr-only" htmlFor="fase-conteudo">
                  Status
                </Label>
                <Select
                  value={fase}
                  onValueChange={(v) => setFase(v as ConteudoStatusFase)}
                >
                  <SelectTrigger
                    id="fase-conteudo"
                    className="h-11 w-full min-w-0 border-zinc-200 bg-white"
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
                    className="h-11 w-full min-w-0 border-zinc-200"
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
                    <SelectTrigger className="h-11 w-full min-w-0 border-zinc-200 bg-white">
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
                <div className="space-y-2">
                  <Label htmlFor="resp">Responsável</Label>
                  <Input
                    id="resp"
                    className="h-11 w-full min-w-0 border-zinc-200"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    placeholder="Nome"
                  />
                </div>
              </div>

              {fase === "agendado" && (
                <div className="rounded-2xl border-2 border-amber-200/60 bg-amber-50/40 p-4 sm:p-5">
                  <p className="mb-3 text-sm font-semibold text-amber-950">
                    Publicação agendada
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="data-pauta">Data</Label>
                      <Input
                        id="data-pauta"
                        type="date"
                        className="h-11 border-zinc-200"
                        value={dataPauta}
                        onChange={(e) => setDataPauta(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hora-pauta">Horário (opcional)</Label>
                      <Input
                        id="hora-pauta"
                        type="time"
                        className="h-11 border-zinc-200"
                        value={horaPauta}
                        onChange={(e) => setHoraPauta(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {fase === "publicado" && (
                <div className="rounded-2xl border-2 border-emerald-200/60 bg-emerald-50/40 p-4 sm:p-5">
                  <p className="mb-3 text-sm font-semibold text-emerald-950">
                    Registro da publicação
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="data-pub">Data da publicação</Label>
                      <Input
                        id="data-pub"
                        type="date"
                        className="h-11 border-zinc-200"
                        value={dataPublicacao}
                        onChange={(e) =>
                          setDataPublicacao(e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hora-pub">Horário (opcional)</Label>
                      <Input
                        id="hora-pub"
                        type="time"
                        className="h-11 border-zinc-200"
                        value={horaPublicacao}
                        onChange={(e) =>
                          setHoraPublicacao(e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="link-post">Link do post</Label>
                      <Input
                        id="link-post"
                        className="h-11 w-full min-w-0 border-zinc-200"
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
                    className="min-h-[100px] resize-y border-zinc-200"
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
                    className="min-h-[88px] resize-y border-zinc-200"
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
                    className="h-11 w-full min-w-0 border-zinc-200"
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
                  className="min-h-[72px] resize-y border-zinc-200"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Equipe, produção, pendências legais…"
                />
              </div>

              <SocialMediaDropzone
                items={media}
                onChange={setMedia}
                label="Mídias"
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
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] text-white"
            >
              {mode === "edit" ? "Salvar alterações" : "Salvar conteúdo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
