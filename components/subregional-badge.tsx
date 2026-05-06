"use client";

import {
  isSubregionalId,
  subregionalMeta,
  type SubregionalId,
} from "@/lib/constants/subregionais";
import { cn } from "@/lib/utils";

type SubregionalBadgeProps = {
  subregional?: SubregionalId | null;
  /** Sem sub no documento → badge “Interno” (cores de `interno`). */
  fallbackId?: SubregionalId;
  size?: "default" | "compact";
  /** Mostra sigla (CV, JT, …) em vez do nome completo. */
  abbreviate?: boolean;
  /** Se false, exibe o texto com a capitalização do rótulo (ex.: listagem). */
  uppercase?: boolean;
  className?: string;
};

export function SubregionalBadge({
  subregional,
  fallbackId = "interno",
  size = "default",
  abbreviate = false,
  uppercase = true,
  className,
}: SubregionalBadgeProps) {
  const id =
    subregional && isSubregionalId(subregional) ? subregional : fallbackId;
  const { label, abbrev, color } = subregionalMeta(id);
  const text = abbreviate ? abbrev : label;

  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 truncate rounded-full font-semibold text-white shadow-sm",
        size === "compact"
          ? "max-w-[9.5rem] px-1.5 py-px text-[9px] leading-tight tracking-wide"
          : "px-2 py-0.5 text-[10px] tracking-wide",
        uppercase && "uppercase",
        className,
      )}
      style={{ backgroundColor: color }}
      title={label}
    >
      {text}
    </span>
  );
}
