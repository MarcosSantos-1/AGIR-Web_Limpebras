/**
 * Webhook da WhatsApp Cloud API — canal de solicitações da Comunicação.
 *
 * GET  → handshake de verificação feito pela Meta ao registar a URL.
 * POST → mensagens recebidas dos colaboradores.
 *
 * Esta rota é pública por natureza (a Meta não envia o Bearer do Firebase), por
 * isso a autenticidade vem da assinatura HMAC do corpo. O trabalho pesado corre
 * em `after()`: a Meta reentrega o webhook se não receber 200 rapidamente.
 */
import { after, NextResponse } from "next/server";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { isValidWhatsAppSignature } from "@/lib/whatsapp/signature";
import { extractInboundMessages, type WhatsAppWebhookPayload } from "@/lib/whatsapp/types";
import { handleInboundMessage } from "@/lib/whatsapp/flow";
import { claimMessage } from "@/lib/firestore/whatsapp-sessions";
import { markAsRead } from "@/lib/whatsapp/client";

export const runtime = "nodejs";
/** Nada aqui pode ser cacheado nem pré-renderizado. */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  let verifyToken: string;
  try {
    verifyToken = getWhatsAppConfig().verifyToken;
  } catch (e) {
    console.error("[whatsapp/webhook] configuração ausente:", e);
    return NextResponse.json(
      { error: "Canal WhatsApp não configurado no servidor." },
      { status: 503 },
    );
  }

  const params = new URL(request.url).searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken && challenge) {
    /** A Meta espera o challenge em texto puro, sem JSON. */
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Verificação recusada." }, { status: 403 });
}

export async function POST(request: Request): Promise<Response> {
  let appSecret: string;
  try {
    appSecret = getWhatsAppConfig().appSecret;
  } catch (e) {
    console.error("[whatsapp/webhook] configuração ausente:", e);
    return NextResponse.json(
      { error: "Canal WhatsApp não configurado no servidor." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!isValidWhatsAppSignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400 });
  }

  const inbound = extractInboundMessages(payload);

  if (inbound.length > 0) {
    after(async () => {
      for (const message of inbound) {
        /** Reentregas da Meta não devem duplicar a solicitação. */
        const isFirstDelivery = await claimMessage(message.wamid).catch(
          () => true,
        );
        if (!isFirstDelivery) continue;

        void markAsRead(message.wamid).catch(() => {});

        try {
          await handleInboundMessage(message);
        } catch (e) {
          console.error(
            `[whatsapp/webhook] falha ao tratar ${message.wamid}:`,
            e,
          );
        }
      }
    });
  }

  /** Webhooks de estado (entregue, lido) chegam aqui e são ignorados. */
  return NextResponse.json({ received: true });
}
