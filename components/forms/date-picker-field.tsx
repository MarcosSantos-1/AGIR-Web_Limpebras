"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import * as React from "react";

type Props = {
  id?: string;
  value: string;
  /** yyyy-MM-dd */
  onChange: (iso: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
};

/** Evita deslocamento de fuso ao interpretar yyyy-MM-dd */
function parseIsoDate(iso: string): Date | undefined {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  return parse(iso, "yyyy-MM-dd", new Date());
}

export function DatePickerField({
  id,
  value,
  onChange,
  placeholder = "Escolher data",
  disabled,
  className,
  required,
}: Props) {
  const selected = parseIsoDate(value);
  const label = selected
    ? format(selected, "dd/MM/yyyy", { locale: ptBR })
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-start text-left font-normal",
            !selected && "text-zinc-500",
            className,
          )}
          aria-required={required}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) onChange(format(d, "yyyy-MM-dd"));
          }}
          locale={ptBR}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
