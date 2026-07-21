"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  SUBREGIONAIS,
  type SubregionalId,
} from "@/lib/constants/subregionais";

type Props = {
  id: string;
  value: SubregionalId | "";
  onChange: (v: SubregionalId) => void;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  /** Rótulo do campo (padrão: Subregional). */
  label?: string;
  /** Asterisco / texto após o rótulo (ex. obrigatório). */
  labelSuffix?: ReactNode;
  /** Excluir opções (ex.: sem &quot;Interno&quot; no mapa). */
  excludeIds?: SubregionalId[];
  /** Ocultar o texto de ajuda sob o campo. */
  hideFooterText?: boolean;
  /** Mostrar sigla (CV, JT…) em destaque ao lado da cor. */
  showAbbrevPrefix?: boolean;
};

export function SubregionalSelectField({
  id,
  value,
  onChange,
  error,
  disabled,
  className,
  label = "Subregional",
  labelSuffix,
  excludeIds,
  hideFooterText,
  showAbbrevPrefix,
}: Props) {
  const excluded = new Set(excludeIds ?? []);
  const options = SUBREGIONAIS.filter((s) => !excluded.has(s.id));

  return (
    <div className={cn("space-y-2 sm:col-span-2", className)}>
      <Label htmlFor={id} className="text-zinc-600 dark:text-zinc-400">
        {label}
        {labelSuffix}
      </Label>
      <Select
        value={value || undefined}
        onValueChange={(v) => onChange(v as SubregionalId)}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className={cn(
            "h-11 w-full min-w-0 border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
            error && "border-red-300 ring-1 ring-red-200 dark:border-red-700 dark:ring-red-900",
          )}
          size="default"
        >
          <SelectValue placeholder={`Selecione a ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {showAbbrevPrefix ? (
                  <>
                    <span className="font-medium text-zinc-800 dark:text-zinc-100">
                      {s.abbrev}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      — {s.label}
                    </span>
                  </>
                ) : (
                  s.label
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!hideFooterText ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Usada na distribuição por região nos Indicadores; &quot;Interno&quot; para
          reuniões e atividades na garagem.
        </p>
      ) : null}
    </div>
  );
}
