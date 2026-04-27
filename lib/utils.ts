import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Exibe `yyyy-MM-dd` como dd/mm/aaaa (pt-BR). Mantém "—" e textos já em dd/mm/aaaa. */
export function formatDateBr(value: string): string {
  if (!value || value === "—") return value
  if (ISO_DATE.test(value)) {
    const [y, m, d] = value.split("-")
    return `${d}/${m}/${y}`
  }
  return value
}
