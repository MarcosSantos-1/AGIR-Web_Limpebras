"use client";

import { downloadImageUrl } from "@/lib/download-image";
import type { GalleryLightboxPhotoItem } from "@/lib/gallery-albums";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  X,
} from "lucide-react";

type PhotoGalleryLightboxProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  photos: GalleryLightboxPhotoItem[];
  initialIndex?: number;
};

function safeFilenamePart(raw: string): string {
  const t = raw.trim().replace(/\s+/g, "-").slice(0, 48);
  return t.replace(/[^a-zA-Z0-9-_]+/g, "") || "foto";
}

export function PhotoGalleryLightbox({
  open,
  onOpenChange,
  title,
  photos,
  initialIndex = 0,
}: PhotoGalleryLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open) {
      const safe =
        photos.length === 0
          ? 0
          : Math.min(Math.max(0, initialIndex), photos.length - 1);
      setIndex(safe);
    }
  }, [open, initialIndex, photos.length]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const goPrev = useCallback(() => {
    if (photos.length === 0) return;
    setIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  }, [photos.length]);
  const goNext = useCallback(() => {
    if (photos.length === 0) return;
    setIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  }, [photos.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, goPrev, goNext]);

  const current = photos[index];

  const handleDownload = useCallback(async () => {
    if (!current?.src) return;
    const base = safeFilenamePart(title ?? "evidencia");
    setDownloading(true);
    try {
      await downloadImageUrl(current.src, `${base}-${index + 1}.jpg`);
    } finally {
      setDownloading(false);
    }
  }, [current?.src, index, title]);

  return (
    <AnimatePresence>
      {open && photos.length > 0 && current && (
        <motion.div
          key="photo-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label={title ? `Fotos — ${title}` : "Visualização de fotos"}
        >
          <div className="absolute right-4 top-4 z-20 flex items-center gap-1">
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={downloading}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
              aria-label="Descarregar foto atual"
            >
              {downloading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              onClick={close}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Fechar"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <button
            type="button"
            onClick={goPrev}
            className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <div className="flex h-full w-full items-center justify-center p-4 pb-32 sm:px-16 sm:pb-36">
            <div className="relative w-full max-w-4xl">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-zinc-900">
                <Image
                  src={current.src}
                  alt={current.alt ?? ""}
                  fill
                  className="object-contain"
                  sizes="(min-width:1024px) 56rem, 100vw"
                  unoptimized
                  priority
                />
                {current.badge ? (
                  <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/65 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    {current.badge}
                  </span>
                ) : null}
                <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-black/50 px-3 py-2 text-white">
                  {title ? (
                    <p className="text-sm font-medium">{title}</p>
                  ) : null}
                  <p className="text-xs text-white/70">
                    {index + 1} / {photos.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={goNext}
            className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6"
            aria-label="Foto seguinte"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="absolute bottom-4 left-1/2 z-10 flex max-w-[min(100%,42rem)] -translate-x-1/2 gap-1.5 overflow-x-auto px-3 py-2">
            {photos.map((p, idx) => (
              <button
                key={`${p.src}-${idx}`}
                type="button"
                onClick={() => setIndex(idx)}
                className={cn(
                  "relative shrink-0 overflow-hidden rounded-lg ring-2 transition",
                  idx === index
                    ? "ring-white"
                    : "ring-white/20 opacity-75 hover:opacity-100",
                  p.thumbEmphasis === "compact"
                    ? "h-11 w-11 sm:h-12 sm:w-12"
                    : "h-14 w-14 sm:h-16 sm:w-16",
                )}
                aria-label={`Miniatura ${idx + 1}`}
              >
                <Image
                  src={p.src}
                  alt=""
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                  unoptimized
                />
                {p.badge ? (
                  <span className="pointer-events-none absolute left-0 top-0 max-w-[95%] rounded-br bg-black/60 px-1 py-0.5 text-center text-[8px] font-bold uppercase leading-tight text-white sm:text-[9px]">
                    {p.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
