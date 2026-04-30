/** Paleta alinhada ao produto (roxo / accent + contrastes legíveis). */
const PALETTE = [
  "#9b0ba6",
  "#6a0eaf",
  "#2563eb",
  "#0d9488",
  "#ca8a04",
  "#ea580c",
  "#db2777",
  "#4f46e5",
] as const;

/** Cor de texto estável por nome (hash simples). */
export function nameAccentColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length];
}
