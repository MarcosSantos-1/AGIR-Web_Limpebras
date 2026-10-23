import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * O webhook é público (a Meta não envia Bearer do Firebase), por isso a única
 * garantia de origem é o HMAC do corpo cru com o app secret. Sem esta validação
 * qualquer pessoa com a URL conseguiria registar solicitações falsas.
 */
export function isValidWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const received = signatureHeader.slice("sha256=".length).trim();
  if (!/^[0-9a-f]+$/i.test(received)) return false;

  const expected = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const a = Buffer.from(received, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
