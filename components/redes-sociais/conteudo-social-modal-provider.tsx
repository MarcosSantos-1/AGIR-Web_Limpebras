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

export type ConteudoStatusFase = "ideia" | "rascunho" | "agendado" | "publicado";

type ConteudoCtx = { open: () => void; close: () => void; isOpen: boolean };
const Ctx = React.createContext<ConteudoCtx | null>(null);

export function useConteudoSocialModal() {
  const v = React.useContext(Ctx);
  if (!v) {
    throw new Error("useConteudoSocialModal deve estar dentro de ConteudoSocialModalProvider");
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

const TIPOS = ["Post", "Reel", "Story"] as const;

function ModalHeroHeader() {
  return (
    <div className="shrink-0 border-b border-zinc-100/80 bg-gradient-to-br from-fuchsia-500/8 via-white to-violet-500/10 px-6 py-5 sm:px-10 sm:py-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f318e3] to-[#6a0eaf] text-white shadow-lg shadow-[#f318e3]/20">
          <Share2 className="h-6 w-6" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <DialogTitle className="text-left text-xl font-semibold tracking-tight">
            Novo conteúdo
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-zinc-600">
            Redes sociais — defina a fase, o formato e anexe mídias. Campos
            extras aparecem conforme o status.
          </DialogDescription>
        </div>
      </div>
    </div>
  );
}

function statusIcon(s: ConteudoStatusFase) {
  switch (s) {
    case "ideia":
      return Lightbulb;
    case "rascunho":
      return FileEdit;
    case "agendado":
      return CalendarClock;
    case "publicado":
      return CheckCircle2;
    default:
      return Lightbulb;
  }
}

export function ConteudoSocialModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Ctx.Provider
      value={{
        open: () => setOpen(true),
        close: () => setOpen(false),
        isOpen: open,
      }}
    >
      {children}
      <ConteudoFormDialog open={open} onOpenChange={setOpen} />
    </Ctx.Provider>
  );
}

function ConteudoFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [fase, setFase] = React.useState<ConteudoStatusFase>("ideia");
  const [tema, setTema] = React.useState("");
  const [tipo, setTipo] = React.useState<(typeof TIPOS)[number]>("Post");
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

  React.useEffect(() => {
    if (!open) return;
    setMedia((prev) => {
      for (const m of prev) URL.revokeObjectURL(m.preview);
      return [];
    });
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
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenChange(false);
  };

  const StatusIcon = statusIcon(fase);

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
          <DialogTitle>Novo conteúdo — Redes sociais</DialogTitle>
        </DialogHeader>
        <ModalHeroHeader />
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
                  <StatusIcon className="h-4 w-4 text-[#9b0ba6]" />
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
                    onValueChange={(v) => setTipo(v as (typeof TIPOS)[number])}
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
                        onChange={(e) => setDataPublicacao(e.target.value)}
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
                        onChange={(e) => setHoraPublicacao(e.target.value)}
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
              Salvar conteúdo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
