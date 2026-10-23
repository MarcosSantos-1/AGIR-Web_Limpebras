import { getWhatsAppConfig } from "@/lib/whatsapp/config";

/**
 * Envio de mensagens pela Graph API.
 *
 * Todas as mensagens daqui são respostas dentro da janela de atendimento de 24h
 * aberta pelo colaborador, por isso não exigem template aprovado pela Meta.
 */

export type ListRow = {
  /** Volta no webhook como `interactive.list_reply.id` (máx. 200 caracteres). */
  id: string;
  /** Máx. 24 caracteres — a Meta rejeita títulos maiores. */
  title: string;
  /** Máx. 72 caracteres. */
  description?: string;
};

export type ReplyButton = {
  id: string;
  /** Máx. 20 caracteres. */
  title: string;
};

const LIST_TITLE_MAX = 24;
const LIST_DESCRIPTION_MAX = 72;
const BUTTON_TITLE_MAX = 20;
const BODY_MAX = 1024;
const LIST_BUTTON_MAX = 20;

function truncate(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

async function postMessage(payload: Record<string, unknown>): Promise<void> {
  const { accessToken, phoneNumberId, graphVersion } = getWhatsAppConfig();
  const url = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `WhatsApp Graph API ${response.status}: ${detail.slice(0, 500)}`,
    );
  }
}

export async function sendText(to: string, body: string): Promise<void> {
  await postMessage({
    to,
    type: "text",
    text: { preview_url: false, body: body.slice(0, BODY_MAX) },
  });
}

export async function sendButtons(
  to: string,
  body: string,
  buttons: ReplyButton[],
  footer?: string,
): Promise<void> {
  await postMessage({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body.slice(0, BODY_MAX) },
      ...(footer ? { footer: { text: truncate(footer, 60) } } : {}),
      action: {
        /** A Meta aceita no máximo 3 botões de resposta rápida. */
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: truncate(b.title, BUTTON_TITLE_MAX) },
        })),
      },
    },
  });
}

export async function sendList(
  to: string,
  options: {
    body: string;
    buttonLabel: string;
    rows: ListRow[];
    header?: string;
    footer?: string;
    sectionTitle?: string;
  },
): Promise<void> {
  await postMessage({
    to,
    type: "interactive",
    interactive: {
      type: "list",
      ...(options.header
        ? { header: { type: "text", text: truncate(options.header, 60) } }
        : {}),
      body: { text: options.body.slice(0, BODY_MAX) },
      ...(options.footer
        ? { footer: { text: truncate(options.footer, 60) } }
        : {}),
      action: {
        button: truncate(options.buttonLabel, LIST_BUTTON_MAX),
        sections: [
          {
            title: truncate(options.sectionTitle ?? "Opções", LIST_TITLE_MAX),
            /** Máximo de 10 linhas por lista interativa. */
            rows: options.rows.slice(0, 10).map((row) => ({
              id: row.id,
              title: truncate(row.title, LIST_TITLE_MAX),
              ...(row.description
                ? { description: truncate(row.description, LIST_DESCRIPTION_MAX) }
                : {}),
            })),
          },
        ],
      },
    },
  });
}

export async function markAsRead(messageId: string): Promise<void> {
  await postMessage({ status: "read", message_id: messageId });
}
