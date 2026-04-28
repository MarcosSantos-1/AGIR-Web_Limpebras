"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageIcon, Trash2, Upload, Video } from "lucide-react";
import { useCallback, useId, useState } from "react";

export type SocialConteudoMediaItem = {
  id: string;
  file: File;
  preview: string;
};

const DEFAULT_MAX_ITEMS = 18;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 120 * 1024 * 1024;

function nextId() {
  return `m-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type Props = {
  items: SocialConteudoMediaItem[];
  onChange: (items: SocialConteudoMediaItem[]) => void;
  maxItems?: number;
  label?: string;
  hint?: string;
};

export function SocialMediaDropzone({
  items,
  onChange,
  maxItems = DEFAULT_MAX_ITEMS,
  label = "Mídias",
  hint = "Clique ou arraste imagens e vídeos para esta área",
}: Props) {
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);

  const revokeUnused = useCallback(
    (prev: SocialConteudoMediaItem[], next: SocialConteudoMediaItem[]) => {
      const keep = new Set(next.map((x) => x.id));
      for (const x of prev) {
        if (!keep.has(x.id)) URL.revokeObjectURL(x.preview);
      }
    },
    [],
  );

  const onFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return;
      const prev = items;
      const next: SocialConteudoMediaItem[] = [...items];
      for (const file of Array.from(list)) {
        if (next.length >= maxItems) break;
        const isImg = file.type.startsWith("image/");
        const isVid = file.type.startsWith("video/");
        if (!isImg && !isVid) continue;
        if (isImg && file.size > MAX_IMAGE_BYTES) continue;
        if (isVid && file.size > MAX_VIDEO_BYTES) continue;
        next.push({
          id: nextId(),
          file,
          preview: URL.createObjectURL(file),
        });
      }
      revokeUnused(prev, next);
      onChange(next);
    },
    [items, onChange, maxItems, revokeUnused],
  );

  const removeAt = (id: string) => {
    const prev = items;
    const next = items.filter((i) => i.id !== id);
    revokeUnused(prev, next);
    onChange(next);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed p-4",
        "border-[#9b0ba6]/30 bg-gradient-to-br from-[#f318e3]/5 to-[#6a0eaf]/5",
        dragOver && "ring-2 ring-[#f318e3]/35",
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
        onFiles(e.dataTransfer.files);
      }}
    >
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
          <Upload className="h-4 w-4 text-[#9b0ba6]" />
          {label}{" "}
          <span className="text-xs font-normal text-zinc-500">
            {items.length}/{maxItems} · imagem até 12 MB · vídeo até 120 MB
          </span>
        </div>
      </div>
      <label
        htmlFor={inputId}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-6 text-sm transition",
          dragOver
            ? "border-[#f318e3]/50 bg-zinc-50"
            : "hover:border-[#f318e3]/30 hover:bg-zinc-50/80",
        )}
      >
        <input
          id={inputId}
          type="file"
          accept="image/*,video/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex items-center gap-3 text-zinc-400">
          <ImageIcon className="h-8 w-8" />
          <Video className="h-8 w-8" />
        </div>
        <span className="text-center text-zinc-600">{hint}</span>
      </label>
      {items.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {items.map((m) => (
            <li
              key={m.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-100 bg-zinc-100"
            >
              {m.file.type.startsWith("image/") ? (
                <img
                  src={m.preview}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <video
                  src={m.preview}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-1.5 pb-1 pt-6">
                <p className="truncate text-[10px] text-white">{m.file.name}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7 rounded-md border-0 bg-black/55 text-white opacity-0 shadow-md transition hover:bg-red-600 hover:text-white group-hover:opacity-100"
                onClick={() => removeAt(m.id)}
                aria-label="Remover mídia"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
