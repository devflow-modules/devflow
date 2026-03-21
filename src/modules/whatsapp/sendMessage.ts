/**
 * Envio de mensagens via WhatsApp Cloud API + persistência inbox.
 */

import { prisma } from "@/modules/financeiro/lib/db";
import { createOutboundMessage } from "@/modules/whatsapp-inbox/whatsappInbox.message.service";
import { loadMetaOnboardingEnv } from "@/modules/whatsapp-onboarding/whatsappOnboarding.env";

export interface SendMessageOptions {
  to: string;
  text: string;
}

export async function sendWhatsAppMessage({
  to,
  text,
}: SendMessageOptions): Promise<void> {
  const env = loadMetaOnboardingEnv();
  const phoneNumberId =
    env.META_PHONE_NUMBER_ID?.trim() || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token =
    env.effectiveAccessToken ||
    process.env.WHATSAPP_ACCESS_TOKEN ||
    process.env.WHATSAPP_TOKEN;

  if (!phoneNumberId || !token) {
    console.warn("[WhatsApp] phone number id ou token não configurados");
    return;
  }

  const recipient = to.replace(/\D/g, "");
  const ver = env.META_API_VERSION.startsWith("v")
    ? env.META_API_VERSION
    : `v${env.META_API_VERSION}`;
  const base = `https://graph.facebook.com/${ver}`;

  const response = await fetch(`${base}/${phoneNumberId}/messages`, {
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

  try {
    const data = (await response.json()) as { messages?: Array<{ id: string }> };
    const messageId = data.messages?.[0]?.id;
    if (messageId) {
      await createOutboundMessage(prisma, {
        waMessageId: messageId,
        toE164: to,
        text,
      });
    }
  } catch (e) {
    console.error("[WhatsApp] persist outbound inbox", e);
  }
}
