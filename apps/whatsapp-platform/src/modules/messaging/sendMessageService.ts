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
import { bumpMetric, logEvent, maskPhoneLike } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import {
  assertAutomaticOutboundAllowed,
  logAutomaticReplyAborted,
  type AutomaticOutboundTriggerContext,
} from "./automaticReplyGuard";
import { getWaAutoReplyClaimTtlMs } from "./automaticReplyClaimConfig";
import {
  claimAutomaticReplySend,
  completeAutomaticReplyClaim,
  failAutomaticReplyClaim,
  verifyAutomaticReplyClaimBeforeSend,
} from "./automaticReplyClaimService";

export interface SendReplyInput {
  tenant: ResolvedTenant;
  to: string;
  text: string;
  /** wa_inbox_threads.id (correlação / métricas) */
  inboxThreadId: string;
  /** Equipa, IA (LLM) ou resposta automática por regras (webhook legado). */
  outboundKind?: "agent" | "ai" | "automation";
  /**
   * Obrigatório para envios automáticos (IA / legado webhook): habilita rechecagem last mile,
   * claim atómico e idempotência por mensagem inbound Meta.
   */
  automaticTrigger?: AutomaticOutboundTriggerContext;
  /** Correlaciona com `trace_id` do webhook / pipeline IA. */
  traceId?: string;
}

export type WebhookAutoReplyResult =
  | { ok: true; messageId: string }
  | { ok: false; aborted: true; reason: string };

async function sendCloudAndPersistOutbound(
  input: SendReplyInput,
  outboundKind: "agent" | "ai" | "automation"
): Promise<{ messageId: string }> {
  const adapter = new WhatsAppCloudAdapter({ accessToken: input.tenant.accessToken });
  const { messageId } = await adapter.sendText(input.tenant.phoneNumberId, {
    to: input.to,
    text: input.text,
  });
  console.info(`[WHATSAPP] outbound tenant=${input.tenant.id} wa_id=${maskPhoneLike(input.to)}`);
  bumpMetric("messages_sent");
  bumpMetric("outbound_dispatch");
  logEvent(
    "info",
    "inbox",
    "message_outbound",
    {
      inboxThreadId: input.inboxThreadId,
      kind: outboundKind,
      to_masked: maskPhoneLike(input.to),
    },
    { trace_id: input.traceId, tenant_id: input.tenant.id }
  );
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

export async function sendWebhookAutoReply(input: SendReplyInput): Promise<WebhookAutoReplyResult> {
  const persistKind = input.outboundKind === "automation" ? "automation" : "ai";
  logEvent(
    "info",
    "inbox",
    "outbound_auto_reply_dispatch",
    {
      phoneNumberId: input.tenant.phoneNumberId,
      to_masked: maskPhoneLike(input.to),
      inboxThreadId: input.inboxThreadId,
      persistKind,
    },
    { trace_id: input.traceId, tenant_id: input.tenant.id }
  );

  const triggerSource = input.automaticTrigger?.triggerSource ?? "unknown";

  if (!input.automaticTrigger) {
    const gateOnly = await assertAutomaticOutboundAllowed(prisma, {
      tenantId: input.tenant.id,
      threadId: input.inboxThreadId,
      trigger: undefined,
    });
    if (!gateOnly.allowed) {
      logAutomaticReplyAborted({
        tenantId: input.tenant.id,
        threadId: input.inboxThreadId,
        reason: gateOnly.reason,
        triggerSource,
      });
      return { ok: false, aborted: true, reason: gateOnly.reason };
    }
    try {
      const { messageId } = await sendCloudAndPersistOutbound(
        { ...input, outboundKind: persistKind },
        persistKind
      );
      return { ok: true, messageId };
    } catch (e) {
      throw e;
    }
  }

  const claimed = await claimAutomaticReplySend(prisma, {
    tenantId: input.tenant.id,
    threadId: input.inboxThreadId,
    trigger: input.automaticTrigger,
    claimTtlMs: getWaAutoReplyClaimTtlMs(),
  });
  if (!claimed.ok) {
    logAutomaticReplyAborted({
      tenantId: input.tenant.id,
      threadId: input.inboxThreadId,
      reason: claimed.reason,
      triggerSource,
    });
    return { ok: false, aborted: true, reason: claimed.reason };
  }

  const preSend = await verifyAutomaticReplyClaimBeforeSend(prisma, {
    claimId: claimed.claimId,
    claimToken: claimed.claimToken,
    tenantId: input.tenant.id,
    threadId: input.inboxThreadId,
    trigger: input.automaticTrigger,
  });
  if (!preSend.ok) {
    await failAutomaticReplyClaim(prisma, {
      claimId: claimed.claimId,
      claimToken: claimed.claimToken,
      failureReason: preSend.reason,
    });
    logAutomaticReplyAborted({
      tenantId: input.tenant.id,
      threadId: input.inboxThreadId,
      reason: preSend.reason,
      triggerSource,
    });
    return { ok: false, aborted: true, reason: preSend.reason };
  }

  try {
    const { messageId } = await sendCloudAndPersistOutbound(
      { ...input, outboundKind: persistKind },
      persistKind
    );
    await completeAutomaticReplyClaim(prisma, {
      claimId: claimed.claimId,
      claimToken: claimed.claimToken,
      outboundWaMessageId: messageId,
    });
    return { ok: true, messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await failAutomaticReplyClaim(prisma, {
      claimId: claimed.claimId,
      claimToken: claimed.claimToken,
      failureReason: msg,
    });
    throw e;
  }
}
