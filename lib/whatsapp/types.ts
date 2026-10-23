/**
 * Tipos do payload de webhook da WhatsApp Cloud API (subconjunto usado pelo bot)
 * e normalização para uma forma simples de consumir no motor de fluxo.
 */

export type WhatsAppInboundMessage = {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  text?: { body?: string };
  interactive?: {
    type?: "list_reply" | "button_reply";
    list_reply?: { id?: string; title?: string; description?: string };
    button_reply?: { id?: string; title?: string };
  };
  button?: { text?: string; payload?: string };
};

export type WhatsAppContact = {
  wa_id?: string;
  profile?: { name?: string };
};

export type WhatsAppWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        metadata?: { display_phone_number?: string; phone_number_id?: string };
        contacts?: WhatsAppContact[];
        messages?: WhatsAppInboundMessage[];
        statuses?: unknown[];
      };
    }>;
  }>;
};

/** Mensagem já normalizada: o fluxo só precisa de quem falou e o que escolheu. */
export type NormalizedInbound = {
  /** `wamid...` — usado para idempotência. */
  wamid: string;
  /** Telefone internacional sem "+" (ex.: 5511964821876). */
  from: string;
  /** Nome do perfil do WhatsApp, quando disponível. */
  profileName?: string;
  /** Texto digitado, ou o título da opção escolhida. */
  text: string;
  /** ID da linha da lista ou do botão escolhido, quando a resposta foi interativa. */
  replyId?: string;
  /** Mensagens que o bot não sabe interpretar (áudio, figurinha, localização...). */
  unsupported: boolean;
};

export function extractInboundMessages(
  payload: WhatsAppWebhookPayload,
): NormalizedInbound[] {
  const out: NormalizedInbound[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const messages = value?.messages;
      if (!messages || messages.length === 0) continue;

      const contactsByWaId = new Map<string, string>();
      for (const c of value?.contacts ?? []) {
        const name = c.profile?.name?.trim();
        if (c.wa_id && name) contactsByWaId.set(c.wa_id, name);
      }

      for (const message of messages) {
        if (!message.id || !message.from) continue;
        out.push({
          wamid: message.id,
          from: message.from,
          profileName: contactsByWaId.get(message.from),
          ...interpretMessage(message),
        });
      }
    }
  }

  return out;
}

function interpretMessage(message: WhatsAppInboundMessage): {
  text: string;
  replyId?: string;
  unsupported: boolean;
} {
  if (message.type === "text") {
    return { text: message.text?.body?.trim() ?? "", unsupported: false };
  }

  if (message.type === "interactive") {
    const listReply = message.interactive?.list_reply;
    if (listReply?.id) {
      return {
        text: listReply.title?.trim() ?? "",
        replyId: listReply.id,
        unsupported: false,
      };
    }
    const buttonReply = message.interactive?.button_reply;
    if (buttonReply?.id) {
      return {
        text: buttonReply.title?.trim() ?? "",
        replyId: buttonReply.id,
        unsupported: false,
      };
    }
  }

  /** Botões de template respondem em `button`, não em `interactive`. */
  if (message.type === "button" && message.button?.payload) {
    return {
      text: message.button.text?.trim() ?? "",
      replyId: message.button.payload,
      unsupported: false,
    };
  }

  return { text: "", unsupported: true };
}
