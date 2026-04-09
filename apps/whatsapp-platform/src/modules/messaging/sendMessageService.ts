/**
 * Envio Cloud API + persistência outbound em wa_inbox_* (canónico).
 */

import { WhatsAppCloudAdapter } from "@devflow/whatsapp-core";
import type { ResolvedTenant } from "@/modules/tenants";
import { waInboxCreateOutbound } from "@/modules/inbox";
import { digitsOnly } from "@/modules/inbox/waInboxUtils";
import { trackMessageSent } from "@/modules/analytics";
import { trackUsage } from "@/modules/billing/usageService";
import { UsageEventType } from "@/generated/prisma-whatsapp";
import { bumpMetric, logEvent } from "@/lib/observability";

export interface SendReplyInput {
  tenant: ResolvedTenant;
  to: string;
  text: string;
  /** wa_inbox_threads.id (correlação / métricas) */
  inboxThreadId: string;
  /** Equipa, IA (LLM) ou resposta automática por regras (webhook legado). */
  outboundKind?: "agent" | "ai" | "automation";
}

async function sendCloudAndPersistOutbound(
  input: SendReplyInput,
  outboundKind: "agent" | "ai" | "automation"
): Promise<{ messageId: string }> {
  const adapter = new WhatsAppCloudAdapter({ accessToken: input.tenant.accessToken });
  const { messageId } = await adapter.sendText(input.tenant.phoneNumberId, {
    to: input.to,
    text: input.text,
  });
  console.info(`[WHATSAPP] outbound tenant=${input.tenant.id} wa_id=${input.to}`);
  bumpMetric("messages_sent");
  logEvent("info", "inbox", "message_outbound", {
    tenantId: input.tenant.id,
    inboxThreadId: input.inboxThreadId,
    kind: outboundKind,
  });
  await waInboxCreateOutbound({
    tenantId: input.tenant.id,
    businessPhoneNumberId: input.tenant.phoneNumberId,
    customerPhoneDigits: digitsOnly(input.to),
    waMessageId: messageId,
    text: input.text,
    businessDigits: digitsOnly(input.tenant.displayPhoneNumber || ""),
    outboundKind,
  }).catch((e) => console.error("[WHATSAPP][ERROR] wa-inbox outbound:", e));
  trackMessageSent();
  trackUsage(input.tenant.id, UsageEventType.MESSAGE_SENT, {
    metadata: {
      source: outboundKind === "agent" ? "sendReplyAndPersist" : "sendWebhookAutoReply",
      inboxThreadId: input.inboxThreadId,
    },
  });
  return { messageId };
}

export async function sendReplyAndPersist(input: SendReplyInput): Promise<{ messageId: string }> {
  return sendCloudAndPersistOutbound({ ...input, outboundKind: input.outboundKind ?? "agent" }, "agent");
}

export async function sendWebhookAutoReply(input: SendReplyInput): Promise<{ messageId: string }> {
  const persistKind = input.outboundKind === "automation" ? "automation" : "ai";
  console.log("[WHATSAPP][DEBUG] sendWebhookAutoReply", {
    tenantId: input.tenant.id,
    phoneNumberId: input.tenant.phoneNumberId,
    to: input.to,
    inboxThreadId: input.inboxThreadId,
    persistKind,
  });
  return sendCloudAndPersistOutbound({ ...input, outboundKind: persistKind }, persistKind);
}
