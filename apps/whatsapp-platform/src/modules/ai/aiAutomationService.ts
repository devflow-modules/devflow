/**
 * Automação de IA por tenant — webhook assíncrono, logs, isolamento.
 */

import type { ResolvedTenant } from "@/modules/tenants/tenantService";
import type { IncomingMessage } from "@devflow/whatsapp-core";
import { prisma } from "@/lib/prisma";
import {
  WaInboxDirection,
  WaInboxThreadStatus,
  type AiAgentConfig,
  type AiAgentTone,
} from "@/generated/prisma-whatsapp";
import { digitsOnly } from "@/modules/inbox/waInboxUtils";
import { generateReply } from "./aiService";
import { sendWebhookAutoReply } from "@/modules/messaging/sendMessageService";
import { isProviderConfigured, tenantDriverToProviderKind } from "./aiProvider";
import { checkAiUsageAllowsNext, trackUsage } from "@/modules/billing/usageService";
import { UsageEventType } from "@/generated/prisma-whatsapp";

export async function getOrCreateAiAgentConfig(tenantId: string): Promise<AiAgentConfig> {
  const existing = await prisma.aiAgentConfig.findUnique({ where: { tenantId } });
  if (existing) return existing;
  return prisma.aiAgentConfig.create({
    data: {
      tenantId,
      enabled: false,
      systemPrompt: "",
      tone: "NEUTRAL",
      maxTokens: 512,
      temperature: 0.7,
      fallbackToHuman: true,
    },
  });
}

export interface TenantAiReadyCheck {
  ready: boolean;
  reason?: string;
}

/**
 * IA automática só roda com: tenant real, config ligada, thread OPEN, driver LLM + chave.
 */
export async function checkTenantAiAutomationReady(
  tenantId: string,
  customerPhoneE164: string
): Promise<TenantAiReadyCheck> {
  if (!tenantId || tenantId === "env") {
    return { ready: false, reason: "tenant_env" };
  }

  const [config, tenant, thread] = await Promise.all([
    prisma.aiAgentConfig.findUnique({ where: { tenantId } }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiDriver: true },
    }),
    prisma.waInboxThread.findUnique({
      where: {
        tenantId_phoneNumber: {
          tenantId,
          phoneNumber: digitsOnly(customerPhoneE164),
        },
      },
      select: { id: true, status: true },
    }),
  ]);

  if (!config?.enabled) {
    return { ready: false, reason: "ai_disabled" };
  }
  if (!thread) {
    return { ready: false, reason: "no_thread" };
  }
  if (thread.status !== WaInboxThreadStatus.OPEN) {
    return { ready: false, reason: "thread_not_open" };
  }

  const kind = tenantDriverToProviderKind(tenant?.aiDriver);
  if (!kind) {
    return { ready: false, reason: "no_llm_driver" };
  }
  if (!isProviderConfigured(kind)) {
    return { ready: false, reason: "no_api_key" };
  }

  const promptOk = config.systemPrompt?.trim().length > 0;
  if (!promptOk) {
    return { ready: false, reason: "empty_prompt" };
  }

  return { ready: true };
}

export interface RunTenantAiAutoReplyInput {
  tenant: ResolvedTenant;
  message: IncomingMessage;
  /** Supabase conversation id (legado) */
  conversationId: string;
  textBody: string;
}

export async function runTenantAiAutoReply(input: RunTenantAiAutoReplyInput): Promise<void> {
  const { tenant, message, conversationId, textBody } = input;
  const tenantId = tenant.id;
  const from = message.from;
  const waMsgId = message.id;

  if (tenantId === "env") return;

  const dup = await prisma.aiMessageLog.findFirst({
    where: {
      tenantId,
      inboundWaMessageId: waMsgId,
      createdAt: { gte: new Date(Date.now() - 120_000) },
    },
  });
  if (dup) return;

  const check = await checkTenantAiAutomationReady(tenantId, from);
  if (!check.ready) return;

  const tenantForPlan = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  if (!(await checkAiUsageAllowsNext(tenantId, tenantForPlan?.plan))) {
    return;
  }

  const [config, tenantRow, thread] = await Promise.all([
    prisma.aiAgentConfig.findUniqueOrThrow({ where: { tenantId } }),
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { aiDriver: true },
    }),
    prisma.waInboxThread.findUnique({
      where: {
        tenantId_phoneNumber: { tenantId, phoneNumber: digitsOnly(from) },
      },
    }),
  ]);

  if (!thread) return;

  const recent = await prisma.waInboxMessage.findMany({
    where: { tenantId, threadId: thread.id, messageType: "TEXT" },
    orderBy: { ts: "desc" },
    take: 10,
    select: { direction: true, contentText: true },
  });

  const chronological = [...recent].reverse();
  const contextMessages: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of chronological) {
    const t = m.contentText?.trim();
    if (!t) continue;
    if (m.direction === WaInboxDirection.INBOUND) {
      contextMessages.push({ role: "user", content: t });
    } else {
      contextMessages.push({ role: "assistant", content: t });
    }
  }

  const gen = await generateReply({
    tenantId,
    conversationId,
    messageText: textBody,
    contextMessages,
    systemPrompt: config.systemPrompt,
    tone: config.tone as AiAgentTone,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    aiDriver: tenantRow.aiDriver,
  });

  if (gen.error || !gen.text) {
    await prisma.aiMessageLog.create({
      data: {
        tenantId,
        waInboxThreadId: thread.id,
        inboundWaMessageId: waMsgId,
        promptUsed: gen.promptUsed || "(vazio)",
        responseGenerated: "",
        tokensUsed: gen.tokensUsed,
        durationMs: gen.durationMs,
        errorMessage: (gen.error ?? "unknown").slice(0, 2000),
      },
    });
    return;
  }

  try {
    const { messageId: outboundWaId } = await sendWebhookAutoReply({
      tenant,
      to: from,
      conversationId,
      text: gen.text,
    });

    await prisma.aiMessageLog.create({
      data: {
        tenantId,
        waInboxThreadId: thread.id,
        inboundWaMessageId: waMsgId,
        outboundWaMessageId: outboundWaId,
        promptUsed: gen.promptUsed,
        responseGenerated: gen.text,
        tokensUsed: gen.tokensUsed,
        durationMs: gen.durationMs,
      },
    });
    trackUsage(tenantId, UsageEventType.AI_RESPONSE, {
      metadata: { threadId: thread.id, inboundWaMessageId: waMsgId },
    });
  } catch (e) {
    await prisma.aiMessageLog.create({
      data: {
        tenantId,
        waInboxThreadId: thread.id,
        inboundWaMessageId: waMsgId,
        promptUsed: gen.promptUsed,
        responseGenerated: gen.text,
        tokensUsed: gen.tokensUsed,
        durationMs: gen.durationMs,
        errorMessage: (e instanceof Error ? e.message : String(e)).slice(0, 2000),
      },
    });
  }
}
