/**
 * Envio de mensagens via WhatsApp Cloud API.
 * Documentação: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 */

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface SendMessageOptions {
  to: string;
  text: string;
}

/**
 * Envia mensagem de texto para um número via WhatsApp Cloud API.
 */
export async function sendWhatsAppMessage({
  to,
  text,
}: SendMessageOptions): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !token) {
    console.warn("[WhatsApp] WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_ACCESS_TOKEN não configurados");
    return;
  }

  const recipient = to.replace(/\D/g, "");

  const response = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipient,
      type: "text",
      text: { body: text },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[WhatsApp] Erro ao enviar:", response.status, err);
    throw new Error(`WhatsApp API error: ${response.status}`);
  }
}
