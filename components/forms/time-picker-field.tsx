"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0"),
);

function splitTime(v: string): { h: string; m: string } {
  if (!v || !v.includes(":")) return { h: "", m: "" };
  const [h, m] = v.split(":");
  const hour = (h ?? "").padStart(2, "0").slice(0, 2);
  let min = (m ?? "").padStart(2, "0").slice(0, 2);
  if (!MINUTES.includes(min)) {
    const n = Number.parseInt(min, 10);
    if (!Number.isNaN(n)) {
      const rounded = Math.round(n / 5) * 5;
      min = String(Math.min(rounded, 55)).padStart(2, "0");
    } else min = "00";
  }
  return { h: hour, m: min };
}

type Props = {
  id?: string;
  value: string;
  /** HH:mm ou "" */
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
};

export function TimePickerField({
  id,
  value,
  onChange,
  placeholder = "Horário",
  disabled,
  className,
  allowClear = true,
}: Props) {
  const { h, m } = splitTime(value);
  const hasValue = Boolean(h && m);

  const setPart = (nextH: string, nextM: string) => {
    if (!nextH || !nextM) {
      onChange("");
      return;
    }
    onChange(`${nextH}:${nextM}`);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select
        value={h || undefined}
        onValueChange={(nh) => setPart(nh, m || "00")}
        disabled={disabled}
      >
        <SelectTrigger
          id={id ? `${id}-h` : undefined}
          className="h-11 min-w-0 flex-1"
        >
          <SelectValue placeholder="Hh" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {HOURS.map((hour) => (
            <SelectItem key={hour} value={hour}>
              {hour}h
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={m || undefined}
        onValueChange={(nm) => setPart(h || "00", nm)}
        disabled={disabled}
      >
        <SelectTrigger
          id={id ? `${id}-m` : undefined}
          className="h-11 min-w-0 flex-1"
        >
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {MINUTES.map((min) => (
            <SelectItem key={min} value={min}>
              :{min}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {allowClear && hasValue && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 text-zinc-500"
          onClick={() => onChange("")}
          aria-label="Limpar horário"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <span className="sr-only">{placeholder}</span>
    </div>
  );
}
