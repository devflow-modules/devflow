/**
 * Serviço de envio de mensagem — usa WhatsAppCloudAdapter e persiste outbound.
 */

import { WhatsAppCloudAdapter } from "@devflow/whatsapp-core";
import type { ResolvedTenant } from "@/modules/tenants/tenantService";
import { insertMessage } from "./messagesRepository";
import { trackMessageSent } from "@/modules/analytics";

export interface SendReplyInput {
  tenant: ResolvedTenant;
  to: string;
  text: string;
  conversationId: string;
}

export async function sendReplyAndPersist(input: SendReplyInput): Promise<{ messageId: string }> {
  const adapter = new WhatsAppCloudAdapter({ accessToken: input.tenant.accessToken });
  const { messageId } = await adapter.sendText(input.tenant.phoneNumberId, {
    to: input.to,
    text: input.text,
  });
  await insertMessage({
    conversation_id: input.conversationId,
    direction: "outbound",
    wa_message_id: messageId,
    body: input.text,
    status: "sent",
  });
  trackMessageSent();
  return { messageId };
}
