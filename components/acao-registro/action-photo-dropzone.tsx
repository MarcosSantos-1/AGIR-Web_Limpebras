"use client";

import { cn } from "@/lib/utils";
import { revokeBlobPhotoUrls } from "@/lib/storage/photo-url-helpers";
import { GripVertical, ImageIcon, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const ACTION_PHOTO_MAX = 12;
export const ACTION_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

const REORDER_MIME = "application/x-agir-photo-reorder";

/** Mantido para fluxos que ainda preferem data URL (ex.: código legado). */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("leitura do arquivo"));
    r.readAsDataURL(file);
  });
}

type Props = {
  photoDataUrls: string[];
  onChange: (urls: string[]) => void;
  maxPhotos?: number;
  variant?: "default" | "emphasis" | "amber";
  label?: string;
  hint?: string;
  /** Texto curto sobre ordem (ex.: arrastar + Antes/Depois nas duas primeiras). */
  orderHint?: string;
  /** Mostra rótulo Antes/Depois nas duas primeiras miniaturas (revitalização). */
  highlightAntesDepoisPair?: boolean;
};

export function ActionPhotoDropzone({
  photoDataUrls,
  onChange,
  maxPhotos = ACTION_PHOTO_MAX,
  variant = "default",
  label = "Fotos",
  hint = "Clique ou arraste imagens para esta área",
  orderHint,
  highlightAntesDepoisPair = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const emitUrls = useCallback(
    (next: string[]) => {
      const removed = photoDataUrls.filter((u) => !next.includes(u));
      revokeBlobPhotoUrls(removed);
      onChange(next);
    },
    [photoDataUrls, onChange],
  );

  const reorderPhotos = useCallback(
    (from: number, to: number) => {
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= photoDataUrls.length ||
        to >= photoDataUrls.length
      ) {
        return;
      }
      const next = [...photoDataUrls];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      emitUrls(next);
    },
    [photoDataUrls, emitUrls],
  );

  const onFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      const next: string[] = [...photoDataUrls];
      for (const file of Array.from(files)) {
        if (next.length >= maxPhotos) break;
        if (!file.type.startsWith("image/")) continue;
        if (file.size > ACTION_PHOTO_MAX_BYTES) continue;
        try {
          next.push(URL.createObjectURL(file));
        } catch {
          /* skip */
        }
      }
      emitUrls(next);
    },
    [photoDataUrls, emitUrls, maxPhotos],
  );

  const openFilePicker = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === "function") {
        void el.showPicker();
        return;
      }
    } catch {
      /* Safari / restrições — cair para .click() */
    }
    el.click();
  }, []);

  const isEmphasis = variant === "emphasis";
  const isAmber = variant === "amber";

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple
      tabIndex={-1}
      aria-hidden
      className="fixed h-px w-px opacity-0"
      style={{ left: 0, top: 0, clipPath: "inset(50%)" }}
      onChange={(e) => {
        void onFiles(e.target.files);
        e.target.value = "";
      }}
    />
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed p-4",
        isEmphasis &&
          "border-[#9b0ba6]/30 bg-gradient-to-br from-[#f318e3]/5 to-[#6a0eaf]/5",
        isAmber && "border-amber-200/80 bg-amber-50/40",
        !isEmphasis && !isAmber && "border-zinc-200 bg-zinc-50/80",
        dragOver &&
          (isAmber
            ? "ring-2 ring-amber-300"
            : "ring-2 ring-[#f318e3]/35"),
      )}
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes(REORDER_MIME)) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(REORDER_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        const reorderRaw = e.dataTransfer.getData(REORDER_MIME);
        if (reorderRaw !== "" && (!e.dataTransfer.files || e.dataTransfer.files.length === 0)) {
          return;
        }
        void onFiles(e.dataTransfer.files);
      }}
    >
      {mounted ? createPortal(fileInput, document.body) : null}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
          <Upload
            className={cn(
              "h-4 w-4",
              isEmphasis ? "text-[#9b0ba6]" : "text-zinc-500",
            )}
          />
          {label}{" "}
          <span className="text-xs font-normal text-zinc-500">
            {photoDataUrls.length}/{maxPhotos} · máx. 2 MB
          </span>
        </div>
      </div>
      <button
        type="button"
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-6 text-sm transition",
          dragOver ? "border-[#f318e3]/50 bg-zinc-50" : "hover:border-[#f318e3]/30 hover:bg-zinc-50/80",
        )}
        onClick={openFilePicker}
      >
        <ImageIcon className="h-8 w-8 text-zinc-400" aria-hidden />
        <span className="text-zinc-600">{hint}</span>
        <span className="sr-only">Abrir seletor de ficheiros</span>
      </button>
      {photoDataUrls.length > 0 && (
        <p className="mt-2 text-xs text-zinc-600">
          {orderHint ??
            "Arraste as miniaturas para alterar a ordem (a galeria usa esta ordem)."}
        </p>
      )}
      {photoDataUrls.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photoDataUrls.map((url, i) => (
            <div
              key={url.startsWith("blob:") ? `${url}-${i}` : `${i}-${url.slice(-32)}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-100"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const raw = e.dataTransfer.getData(REORDER_MIME);
                if (raw === "") return;
                const from = Number(raw);
                if (Number.isNaN(from)) return;
                reorderPhotos(from, i);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(REORDER_MIME, String(i));
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={(e) => e.dataTransfer.clearData()}
              />
              {highlightAntesDepoisPair && i === 0 && photoDataUrls.length >= 1 ? (
                <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                  Antes
                </span>
              ) : null}
              {highlightAntesDepoisPair && i === 1 ? (
                <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                  Depois
                </span>
              ) : null}
              <div
                className="absolute bottom-1 left-1 flex cursor-grab items-center rounded bg-black/45 px-0.5 text-white opacity-80 active:cursor-grabbing group-hover:opacity-100"
                title="Arrastar para reordenar"
              >
                <GripVertical className="h-3.5 w-3.5" aria-hidden />
              </div>
              <button
                type="button"
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition group-hover:opacity-100"
                onClick={(ev) => {
                  ev.stopPropagation();
                  ev.preventDefault();
                  emitUrls(photoDataUrls.filter((_, j) => j !== i));
                }}
                aria-label="Remover foto"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
