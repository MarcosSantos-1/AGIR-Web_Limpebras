/** Iniciais a partir do nome para avatar. */
export function initialsFromNome(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[parts.length - 1]?.[0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  const one = parts[0];
  if (one && one.length >= 2) return one.slice(0, 2).toUpperCase();
  if (one) return `${one[0]!.toUpperCase()}?`;
  return "??";
}
