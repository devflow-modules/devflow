/**
 * Handler do webhook WhatsApp.
 * Processa mensagens recebidas e decide a resposta.
 */

import { MESSAGES } from "./messages";
import { parseMessage } from "./messageParser";
import { sendWhatsAppMessage } from "./sendMessage";

export interface IncomingMessage {
  from: string;
  type: string;
  text?: { body: string };
}

/**
 * Processa uma mensagem recebida e envia a resposta apropriada.
 */
export async function handleIncomingMessage(msg: IncomingMessage): Promise<void> {
  const { from, type, text } = msg;

  if (type !== "text" || !text?.body) {
    return;
  }

  const intent = parseMessage(text.body);
  let reply: string;

  // Modo demo: mensagem especial
  const isDemoMode = process.env.WHATSAPP_DEMO_MODE === "true";
  if (isDemoMode && text.body.toLowerCase().trim() === "demo") {
    reply = MESSAGES.demo;
  } else if (intent) {
    reply = MESSAGES[intent];
  } else {
    reply = MESSAGES.fallback;
  }

  await sendWhatsAppMessage({ to: from, text: reply });
}
