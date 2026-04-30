"use client";

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
};

export function SubregionalSelectField({
  id,
  value,
  onChange,
  error,
  disabled,
  className,
}: Props) {
  return (
    <div className={cn("space-y-2 sm:col-span-2", className)}>
      <Label htmlFor={id} className="text-zinc-600">
        Subregional
      </Label>
      <Select
        value={value || undefined}
        onValueChange={(v) => onChange(v as SubregionalId)}
        disabled={disabled}
        required
      >
        <SelectTrigger
          id={id}
          className={cn(
            "h-11 w-full min-w-0 border-zinc-200 bg-white",
            error && "border-red-300 ring-1 ring-red-200",
          )}
          size="default"
        >
          <SelectValue placeholder="Selecione a subregional" />
        </SelectTrigger>
        <SelectContent>
          {SUBREGIONAIS.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-zinc-500">
        Usada na distribuição por região nos Indicadores; &quot;Interno&quot; para
        reuniões e atividades na garagem.
      </p>
    </div>
  );
}
