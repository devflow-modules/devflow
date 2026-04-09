/**
 * Automação de IA por tenant — webhook assíncrono, logs, isolamento.
 */

import type { ResolvedTenant } from "@/modules/tenants";
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
import { openAiConfig, DEFAULT_SYSTEM_PROMPT } from "./openai";
import {
  generateReply as generateOpenAiReply,
  isOpenAiConfigured,
  type GenerateReplyOutput,
} from "./openaiReplyService";
import { sendWebhookAutoReply } from "@/modules/messaging/sendMessageService";
import { isProviderConfigured, tenantDriverToProviderKind } from "./aiProvider";
import { canUseFeature } from "@/modules/billing/featureGate";
import {
  enforceUsageOrThrow,
  UsageLimitExceededError,
} from "@/modules/billing/enforcementService";
import { trackUsage } from "@/modules/billing/usageService";
import { trackAiUsage } from "@/modules/ai/aiUsageService";
import { billAiOverageIfApplicableAsync } from "@/modules/billing/stripeUsageBillingService";
import { getAiUsageStatus } from "@/modules/billing/aiUsageLimitService";
import { UsageEventType } from "@/generated/prisma-whatsapp";

export async function getOrCreateAiAgentConfig(tenantId: string): Promise<AiAgentConfig> {
  const existing = await prisma.aiAgentConfig.findUnique({ where: { tenantId } });
  if (existing) return existing;
  return prisma.aiAgentConfig.create({
    data: {
      tenantId,
      enabled: false,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      model: openAiConfig.model,
      tone: "NEUTRAL",
      maxTokens: openAiConfig.maxTokens,
      temperature: openAiConfig.temperature,
      fallbackToHuman: true,
    },
  });
}

export interface TenantAiReadyCheck {
  ready: boolean;
  reason?: string;
}

/**
 * IA automática roda quando:
 * - OPENAI_API_KEY existe (modo standalone) OU
 * - tenant real, config ligada, thread OPEN, driver LLM + chave.
 */
export async function checkTenantAiAutomationReady(
  tenantId: string,
  customerPhoneE164: string,
  businessPhoneNumberId: string
): Promise<TenantAiReadyCheck> {
  if (!tenantId || tenantId === "env") {
    return { ready: false, reason: "tenant_env" };
  }

  if (isOpenAiConfigured()) {
    const bizEarly = businessPhoneNumberId?.trim();
    if (!bizEarly) {
      return { ready: false, reason: "no_business_line" };
    }
    const threadOnly = await prisma.waInboxThread.findUnique({
      where: {
        tenantId_phoneNumber_businessPhoneNumberId: {
          tenantId,
          phoneNumber: digitsOnly(customerPhoneE164),
          businessPhoneNumberId: bizEarly,
        },
      },
      select: { id: true, status: true, assignedToUserId: true },
    });
    if (!threadOnly) {
      return { ready: false, reason: "no_thread" };
    }
    if (threadOnly.status !== WaInboxThreadStatus.OPEN) {
      return { ready: false, reason: "thread_not_open" };
    }
    if (threadOnly.assignedToUserId) {
      return { ready: false, reason: "human_handoff" };
    }
    return { ready: true, reason: "openai_standalone" };
  }

  const biz = businessPhoneNumberId?.trim();
  if (!biz) {
    return { ready: false, reason: "no_business_line" };
  }

  const [config, tenant, thread] = await Promise.all([
    prisma.aiAgentConfig.findUnique({ where: { tenantId } }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiDriver: true },
    }),
    prisma.waInboxThread.findUnique({
      where: {
        tenantId_phoneNumber_businessPhoneNumberId: {
          tenantId,
          phoneNumber: digitsOnly(customerPhoneE164),
          businessPhoneNumberId: biz,
        },
      },
      select: { id: true, status: true, assignedToUserId: true },
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
  if (thread.assignedToUserId) {
    return { ready: false, reason: "human_handoff" };
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

  if (!(await canUseFeature(tenantId, "AI_RESPONSE"))) {
    return { ready: false, reason: "ai_blocked_by_plan" };
  }

  return { ready: true };
}

export interface RunTenantAiAutoReplyInput {
  tenant: ResolvedTenant;
  message: IncomingMessage;
  /** wa_inbox_threads.id */
  inboxThreadId: string;
  textBody: string;
}

export async function runTenantAiAutoReply(input: RunTenantAiAutoReplyInput): Promise<void> {
  const { tenant, message, inboxThreadId, textBody } = input;
  const tenantId = tenant.id;
  const from = message.from;
  const waMsgId = message.id;

  if (tenantId === "env") return;

  const alreadyCompleted = await prisma.aiMessageLog.findFirst({
    where: {
      tenantId,
      inboundWaMessageId: waMsgId,
      outboundWaMessageId: { not: null },
    },
    select: { id: true },
  });
  if (alreadyCompleted) return;

  const recentDup = await prisma.aiMessageLog.findFirst({
    where: {
      tenantId,
      inboundWaMessageId: waMsgId,
      createdAt: { gte: new Date(Date.now() - 120_000) },
    },
  });
  if (recentDup) return;

  const check = await checkTenantAiAutomationReady(tenantId, from, tenant.phoneNumberId);
  if (!check.ready) return;

  try {
    await enforceUsageOrThrow({ tenantId, feature: "messages", quantity: 1 });
    await enforceUsageOrThrow({ tenantId, feature: "ai", quantity: 1 });
  } catch (e) {
    if (e instanceof UsageLimitExceededError && e.feature === "ai") {
      trackAiUsage(tenantId, "AI_FALLBACK");
      console.warn("[AI] Limite mensal excedido, fallback legacy", { tenantId });
    }
    return;
  }

  const usageStatus = await getAiUsageStatus(tenantId);
  const isStandalone = check.reason === "openai_standalone";

  if (isStandalone) {
    const [config, thread] = await Promise.all([
      prisma.aiAgentConfig.findUnique({ where: { tenantId } }).then((c) => c ?? getOrCreateAiAgentConfig(tenantId)),
      prisma.waInboxThread.findUnique({
        where: {
          tenantId_phoneNumber_businessPhoneNumberId: {
            tenantId,
            phoneNumber: digitsOnly(from),
            businessPhoneNumberId: tenant.phoneNumberId,
          },
        },
        select: { id: true },
      }),
    ]);

    const contextMessages: { role: "user" | "assistant"; content: string }[] = [];
    if (thread) {
      const recent = await prisma.waInboxMessage.findMany({
        where: { tenantId, threadId: thread.id, messageType: "TEXT" },
        orderBy: { ts: "desc" },
        take: 10,
        select: { direction: true, contentText: true },
      });
      const chronological = [...recent].reverse();
      for (const m of chronological) {
        const t = m.contentText?.trim();
        if (!t) continue;
        contextMessages.push({
          role: m.direction === WaInboxDirection.INBOUND ? "user" : "assistant",
          content: t,
        });
      }
    }

    const gen: GenerateReplyOutput = await generateOpenAiReply({
      message: textBody,
      contextMessages,
      systemPrompt: config.systemPrompt || null,
      model: config.model ?? openAiConfig.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      useStructuredOutput: false,
    });

    if (gen.fallback || gen.error || !gen.reply?.trim()) {
      trackAiUsage(tenantId, "AI_FALLBACK");
      console.warn("[WHATSAPP][WARN] OpenAI fallback para legacy", { reason: gen.error });
      throw new Error(gen.error ?? "Resposta vazia");
    }

    trackAiUsage(tenantId, "AI_SUCCESS", gen.tokensUsed ?? 0);
    billAiOverageIfApplicableAsync({
      tenantId,
      messageId: waMsgId,
      used: usageStatus.used,
      limit: usageStatus.limit,
      plan: usageStatus.plan,
    });
    const sendResult = await sendWebhookAutoReply({
      tenant,
      to: from,
      inboxThreadId,
      text: gen.reply,
      outboundKind: "ai",
      automaticTrigger: { inboundWaMessageId: waMsgId, triggerSource: "ai" },
    });
    if (!sendResult.ok) return;

    trackUsage(tenantId, UsageEventType.AI_RESPONSE, {
      metadata: {
        source: "openai_standalone",
        inboundWaMessageId: waMsgId,
        tokensUsed: gen.tokensUsed,
        durationMs: gen.durationMs,
      },
    });

    if (thread) {
      await prisma.aiMessageLog.create({
        data: {
          tenantId,
          waInboxThreadId: thread.id,
          inboundWaMessageId: waMsgId,
          outboundWaMessageId: sendResult.messageId,
          promptUsed: "",
          responseGenerated: gen.reply,
          tokensUsed: gen.tokensUsed,
          durationMs: gen.durationMs,
        },
      }).catch(() => {});
    }
    return;
  }

  const [config, tenantRow, thread] = await Promise.all([
    prisma.aiAgentConfig.findUnique({ where: { tenantId } }).then((c) => c ?? getOrCreateAiAgentConfig(tenantId)),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiDriver: true },
    }),
    prisma.waInboxThread.findUnique({
      where: {
        tenantId_phoneNumber_businessPhoneNumberId: {
          tenantId,
          phoneNumber: digitsOnly(from),
          businessPhoneNumberId: tenant.phoneNumberId,
        },
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
    conversationId: inboxThreadId,
    messageText: textBody,
    contextMessages,
    systemPrompt: config.systemPrompt?.trim() || "",
    tone: config.tone as AiAgentTone,
    model: config.model ?? openAiConfig.model,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    aiDriver: tenantRow?.aiDriver ?? null,
  });

  if (gen.error || !gen.text) {
    trackAiUsage(tenantId, "AI_FALLBACK");
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
    throw new Error(gen.error ?? "Falha ao gerar resposta IA");
  }

  trackAiUsage(tenantId, "AI_SUCCESS", gen.tokensUsed ?? 0);
  billAiOverageIfApplicableAsync({
    tenantId,
    messageId: waMsgId,
    used: usageStatus.used,
    limit: usageStatus.limit,
    plan: usageStatus.plan,
  });
  try {
    const sendResult = await sendWebhookAutoReply({
      tenant,
      to: from,
      inboxThreadId,
      text: gen.text,
      outboundKind: "ai",
      automaticTrigger: { inboundWaMessageId: waMsgId, triggerSource: "ai" },
    });
    if (!sendResult.ok) return;
    const outboundWaId = sendResult.messageId;

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
    throw e;
  }
}
