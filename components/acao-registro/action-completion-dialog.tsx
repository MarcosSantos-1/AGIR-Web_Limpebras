"use client";

import {
  ActionPhotoDropzone,
  ACTION_PHOTO_MAX,
} from "@/components/acao-registro/action-photo-dropzone";
import { LinksPostagemEditor } from "@/components/acao-registro/post-links";
import { DatePickerField } from "@/components/forms/date-picker-field";
import { TimePickerField } from "@/components/forms/time-picker-field";
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
import { cn, parseLinksMultiline } from "@/lib/utils";
import { useEffect, useId, useState } from "react";

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
  /** URLs de postagens (redes, matérias, etc.) — uma por linha no formulário */
  linksPostagem?: string[];
};

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
  const [linksText, setLinksText] = useState("");
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
    setLinksText((initial?.linksPostagem ?? []).join("\n"));
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
    initial?.linksPostagem,
    initial?.photoDataUrls,
  ]);

  const buildPayload = (): ActionCompletionPayload => {
    const links = parseLinksMultiline(linksText);
    const base: ActionCompletionPayload = {
      description: description.trim(),
      observations: observations.trim(),
      photoDataUrls,
      linksPostagem: links,
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
                  <div className="mt-1.5">
                    <DatePickerField
                      id={`${baseId}-date`}
                      value={date}
                      onChange={setDate}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={`${baseId}-ts`}>Início</Label>
                    <div className="mt-1.5">
                      <TimePickerField
                        id={`${baseId}-ts`}
                        value={timeStart}
                        onChange={setTimeStart}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`${baseId}-te`}>Fim</Label>
                    <div className="mt-1.5">
                      <TimePickerField
                        id={`${baseId}-te`}
                        value={timeEnd}
                        onChange={setTimeEnd}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor={`${baseId}-loc`}>Local / endereço</Label>
                <Input
                  id={`${baseId}-loc`}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1.5 rounded-xl"
                  placeholder="Rua, número, bairro ou nome do local"
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

          <LinksPostagemEditor
            id={`${baseId}-links`}
            value={linksText}
            onChange={setLinksText}
            hint={
              showMetaFields
                ? "Aparece no histórico e na agenda quando houver pelo menos um link."
                : "Um link por linha, opcional."
            }
            textareaClassName="mt-0 rounded-xl"
          />

          <ActionPhotoDropzone
            photoDataUrls={photoDataUrls}
            onChange={setPhotoDataUrls}
            maxPhotos={ACTION_PHOTO_MAX}
            variant={isGallery ? "emphasis" : "default"}
            label={isGallery ? "Fotos (enfatizado)" : "Fotos"}
            hint="Clique para enviar ou solte imagens nesta área"
          />
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
