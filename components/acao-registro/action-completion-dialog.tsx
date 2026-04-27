"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

export type ActionCompletionPayload = {
  /** Título (agenda / histórico) */
  title?: string;
  /** yyyy-MM-dd */
  date?: string;
  timeStart?: string;
  timeEnd?: string;
  location?: string;
  responsible?: string;
  description: string;
  observations: string;
  photoDataUrls: string[];
};

const MAX_PHOTOS = 12;
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("leitura do arquivo"));
    r.readAsDataURL(file);
  });
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  initial?: Partial<ActionCompletionPayload>;
  /** mostra título, data, horas, local, responsável (Agenda e Histórico) */
  showMetaFields?: boolean;
  /** default: formulário padrão; gallery: destaque no upload de fotos */
  variant?: "default" | "gallery";
  submitLabel?: string;
  onSubmit: (payload: ActionCompletionPayload) => void;
  showDeleteButton?: boolean;
  onDelete?: () => void;
  deleteConfirmMessage?: string;
};

const defaultDeleteMsg =
  "Excluir este registro? Esta ação não pode ser desfeita (aplicação local).";

export function ActionCompletionDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  initial,
  showMetaFields = false,
  variant = "default",
  submitLabel = "Salvar",
  onSubmit,
  showDeleteButton = false,
  onDelete,
  deleteConfirmMessage = defaultDeleteMsg,
}: Props) {
  const baseId = useId();
  const [metaTitle, setMetaTitle] = useState("");
  const [date, setDate] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [location, setLocation] = useState("");
  const [responsible, setResponsible] = useState("");
  const [description, setDescription] = useState("");
  const [observations, setObservations] = useState("");
  const [photoDataUrls, setPhotoDataUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMetaTitle(initial?.title ?? "");
    setDate(initial?.date ?? "");
    setTimeStart(initial?.timeStart ?? "");
    setTimeEnd(initial?.timeEnd ?? "");
    setLocation(initial?.location ?? "");
    setResponsible(initial?.responsible ?? "");
    setDescription(initial?.description ?? "");
    setObservations(initial?.observations ?? "");
    setPhotoDataUrls(initial?.photoDataUrls ? [...initial.photoDataUrls] : []);
  }, [
    open,
    initial?.title,
    initial?.date,
    initial?.timeStart,
    initial?.timeEnd,
    initial?.location,
    initial?.responsible,
    initial?.description,
    initial?.observations,
    initial?.photoDataUrls,
  ]);

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const next: string[] = [...photoDataUrls];
      for (const file of Array.from(files)) {
        if (next.length >= MAX_PHOTOS) break;
        if (!file.type.startsWith("image/")) continue;
        if (file.size > MAX_FILE_BYTES) continue;
        try {
          const dataUrl = await readFileAsDataUrl(file);
          next.push(dataUrl);
        } catch {
          /* skip */
        }
      }
      setPhotoDataUrls(next);
    },
    [photoDataUrls],
  );

  const buildPayload = (): ActionCompletionPayload => {
    const base: ActionCompletionPayload = {
      description: description.trim(),
      observations: observations.trim(),
      photoDataUrls,
    };
    if (showMetaFields) {
      return {
        ...base,
        title: metaTitle.trim() || undefined,
        date: date || undefined,
        timeStart: timeStart || undefined,
        timeEnd: timeEnd || undefined,
        location: location.trim() || undefined,
        responsible: responsible.trim() || undefined,
      };
    }
    return base;
  };

  const handleSubmit = () => {
    setSaving(true);
    try {
      onSubmit(buildPayload());
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (window.confirm(deleteConfirmMessage)) {
      onDelete();
      onOpenChange(false);
    }
  };

  const isGallery = variant === "gallery";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg",
          (isGallery || showMetaFields) && "sm:max-w-2xl",
        )}
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="pr-6">{title}</DialogTitle>
          {subtitle && (
            <DialogDescription className="text-left">{subtitle}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {showMetaFields && (
            <div className="space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Dados do compromisso
              </p>
              <div>
                <Label htmlFor={`${baseId}-mtitle`}>Título</Label>
                <Input
                  id={`${baseId}-mtitle`}
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`${baseId}-date`}>Data</Label>
                  <Input
                    id={`${baseId}-date`}
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={`${baseId}-ts`}>Início</Label>
                    <Input
                      id={`${baseId}-ts`}
                      type="time"
                      value={timeStart}
                      onChange={(e) => setTimeStart(e.target.value)}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${baseId}-te`}>Fim</Label>
                    <Input
                      id={`${baseId}-te`}
                      type="time"
                      value={timeEnd}
                      onChange={(e) => setTimeEnd(e.target.value)}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor={`${baseId}-loc`}>Local</Label>
                <Input
                  id={`${baseId}-loc`}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor={`${baseId}-resp`}>Responsável</Label>
                <Input
                  id={`${baseId}-resp`}
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor={`${baseId}-desc`}>O que foi feito</Label>
            <Textarea
              id={`${baseId}-desc`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={isGallery ? 3 : 4}
              className="mt-1.5 rounded-xl"
              placeholder="Resumo do trabalho realizado, etapas e resultados"
            />
          </div>
          <div>
            <Label htmlFor={`${baseId}-obs`}>Observações</Label>
            <Textarea
              id={`${baseId}-obs`}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={isGallery ? 2 : 3}
              className="mt-1.5 rounded-xl"
              placeholder="Notas, pendências, próximos passos"
            />
          </div>

          <div
            className={cn(
              "rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-4",
              isGallery &&
                "border-[#9b0ba6]/30 bg-gradient-to-br from-[#f318e3]/5 to-[#6a0eaf]/5",
            )}
          >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
                  <Upload
                    className={cn("h-4 w-4", isGallery ? "text-[#9b0ba6]" : "text-zinc-500")}
                  />
                  Fotos {isGallery && "(enfatizado)"}
                </div>
                <span className="text-xs text-zinc-500">
                  {photoDataUrls.length}/{MAX_PHOTOS} · imagens · máx. 2 MB
                </span>
              </div>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-6 text-sm text-zinc-500 transition hover:border-[#f318e3]/30 hover:bg-zinc-50/80">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    void onFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <ImageIcon className="h-8 w-8 text-zinc-400" />
                <span>Clique para enviar ou solte arquivos aqui</span>
              </label>
              {photoDataUrls.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {photoDataUrls.map((url, i) => (
                    <div
                      key={`${i}-${url.slice(0, 20)}`}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-100"
                    >
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition group-hover:opacity-100"
                        onClick={() =>
                          setPhotoDataUrls((prev) => prev.filter((_, j) => j !== i))
                        }
                        aria-label="Remover foto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:gap-2">
          <div className="flex flex-wrap gap-2">
            {showDeleteButton && onDelete && (
              <Button
                type="button"
                variant="destructive"
                className="rounded-xl"
                onClick={handleDelete}
              >
                Excluir
              </Button>
            )}
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] text-white"
              disabled={saving}
              onClick={handleSubmit}
            >
              {submitLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
