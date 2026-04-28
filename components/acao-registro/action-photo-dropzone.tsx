"use client";

import { cn } from "@/lib/utils";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { useCallback, useId, useState } from "react";

export const ACTION_PHOTO_MAX = 12;
export const ACTION_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

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
};

export function ActionPhotoDropzone({
  photoDataUrls,
  onChange,
  maxPhotos = ACTION_PHOTO_MAX,
  variant = "default",
  label = "Fotos",
  hint = "Clique ou arraste imagens para esta área",
}: Props) {
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const next: string[] = [...photoDataUrls];
      for (const file of Array.from(files)) {
        if (next.length >= maxPhotos) break;
        if (!file.type.startsWith("image/")) continue;
        if (file.size > ACTION_PHOTO_MAX_BYTES) continue;
        try {
          const dataUrl = await readFileAsDataUrl(file);
          next.push(dataUrl);
        } catch {
          /* skip */
        }
      }
      onChange(next);
    },
    [photoDataUrls, onChange, maxPhotos],
  );

  const isEmphasis = variant === "emphasis";
  const isAmber = variant === "amber";

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
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
      }}
      onDragOver={(e) => {
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
        void onFiles(e.dataTransfer.files);
      }}
    >
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
      <label
        htmlFor={inputId}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-6 text-sm transition",
          dragOver ? "border-[#f318e3]/50 bg-zinc-50" : "hover:border-[#f318e3]/30 hover:bg-zinc-50/80",
        )}
      >
        <input
          id={inputId}
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
        <span className="text-zinc-600">{hint}</span>
      </label>
      {photoDataUrls.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photoDataUrls.map((url, i) => (
            <div
              key={`${i}-${url.slice(0, 24)}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition group-hover:opacity-100"
                onClick={() =>
                  onChange(photoDataUrls.filter((_, j) => j !== i))
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
  );
}
