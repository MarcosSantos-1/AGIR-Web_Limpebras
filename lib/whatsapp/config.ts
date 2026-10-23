/**
 * Configuração da WhatsApp Cloud API (apenas servidor).
 *
 * Nenhuma destas variáveis pode ter prefixo NEXT_PUBLIC_: o access token
 * permite enviar mensagens em nome do número e o app secret assina webhooks.
 */

export type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  appSecret: string;
  verifyToken: string;
  graphVersion: string;
};

const DEFAULT_GRAPH_VERSION = "v23.0";

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getWhatsAppConfig(): WhatsAppConfig {
  const accessToken = readEnv("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = readEnv("WHATSAPP_PHONE_NUMBER_ID");
  const appSecret = readEnv("WHATSAPP_APP_SECRET");
  const verifyToken = readEnv("WHATSAPP_VERIFY_TOKEN");

  const missing = [
    !accessToken && "WHATSAPP_ACCESS_TOKEN",
    !phoneNumberId && "WHATSAPP_PHONE_NUMBER_ID",
    !appSecret && "WHATSAPP_APP_SECRET",
    !verifyToken && "WHATSAPP_VERIFY_TOKEN",
  ].filter((v): v is string => typeof v === "string");

  if (missing.length > 0) {
    throw new Error(
      `WhatsApp Cloud API não configurada: falta ${missing.join(", ")}.`,
    );
  }

  return {
    accessToken,
    phoneNumberId,
    appSecret,
    verifyToken,
    graphVersion: readEnv("WHATSAPP_GRAPH_VERSION") || DEFAULT_GRAPH_VERSION,
  };
}

export function isWhatsAppConfigured(): boolean {
  try {
    getWhatsAppConfig();
    return true;
  } catch {
    return false;
  }
}
