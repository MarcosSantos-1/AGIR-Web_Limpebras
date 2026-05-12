"use client";

import type { SocialPublicationRede } from "@/data/social-posts";
import { cn } from "@/lib/utils";

const BRAND_CLASS: Record<SocialPublicationRede, string> = {
  facebook: "fa-brands fa-square-facebook",
  instagram: "fa-brands fa-instagram",
  linkedin: "fa-brands fa-linkedin",
};

export function SocialRedeFaIcon({
  rede,
  className,
  title,
}: {
  rede: SocialPublicationRede;
  className?: string;
  /** Rótulo acessível quando o ícone é o único indicador da rede. */
  title?: string;
}) {
  return (
    <i
      className={cn(BRAND_CLASS[rede], className)}
      aria-hidden
      title={title}
    />
  );
}
