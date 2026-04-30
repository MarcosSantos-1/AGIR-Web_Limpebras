/** Máscara de telefone BR: `(11) 99999-9999` (celular) ou `(11) 3333-4444` (fixo). */

function stripBrazilCountryCode(digits: string): string {
  let d = digits;
  if (d.startsWith("55") && d.length > 11) {
    d = d.slice(2);
  }
  return d.slice(0, 11);
}

/** Formata para exibição a partir de entrada (paste com espaços/+55 incluso). */
export function formatBrazilPhoneInput(raw: string): string {
  const digits = stripBrazilCountryCode(raw.replace(/\D/g, ""));
  if (!digits.length) return "";

  if (digits.length === 1) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  if (digits.length === 2) return `(${ddd})`;

  const subscriber = digits.slice(2);

  const isMobile = subscriber[0] === "9";
  const sub = isMobile ? subscriber.slice(0, 9) : subscriber.slice(0, 8);

  if (!sub.length) return `(${ddd}) `;

  if (isMobile) {
    if (sub.length <= 5) {
      return `(${ddd}) ${sub}`;
    }
    return `(${ddd}) ${sub.slice(0, 5)}-${sub.slice(5)}`;
  }
  if (sub.length <= 4) {
    return `(${ddd}) ${sub}`;
  }
  return `(${ddd}) ${sub.slice(0, 4)}-${sub.slice(4)}`;
}

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/** Celular 11 dígitos ou telefone fixo 10 dígitos. */
export function isCompleteBrazilPhone(displayOrDigits: string): boolean {
  const d = onlyDigits(displayOrDigits);
  return d.length === 10 || d.length === 11;
}
