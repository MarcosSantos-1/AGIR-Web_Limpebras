"use client";

import { isLikelyVideoUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  className?: string;
  alt?: string;
};

/** Miniatura de evidência: imagem ou primeiro frame de vídeo. */
export function EvidenceMediaThumb({ url, className, alt = "" }: Props) {
  if (isLikelyVideoUrl(url)) {
    return (
      <video
        src={url}
        className={cn(className)}
        muted
        playsInline
        preload="metadata"
        aria-hidden={!alt}
      />
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
    />
  );
}
