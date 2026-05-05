/**
 * Automação de IA por tenant — webhook assíncrono, logs, isolamento.
 */

import type { ResolvedTenant } from "@/modules/tenants";
import type { IncomingMessage } from "@devflow/whatsapp-core";
import { prisma } from "@/lib/prisma";
import {
  WaInboxDirection,
  WaInboxThreadStatus,
  WhatsappPhoneNumberStatus,
  type AiAgentConfig,
} from "@/generated/prisma-whatsapp";
import { digitsOnly } from "@/modules/inbox/waInboxUtils";
import { generateReply } from "./aiService";
import { openAiConfig } from "./openai";
import { buildAgentSystemPrompt, hasEffectiveAgentPrompt } from "./prompt/agentSystemPrompt";
import {
  agentPromptInputFromConfigAndChannel,
  resolveEffectiveAutoReply,
} from "@/modules/whatsapp/channelAiBehavior";
import { resolveEffectiveDriver } from "./resolveAiRuntimeConfig";
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
import { shouldAiReply } from "@/modules/ai/aiGuard";
import {
  buildRecentMessagesSummary,
  countInboundTextMessages,
  parsePlaybookJson,
  persistThreadAiStateIfChanged,
  resolveNextState,
  type AiPlaybookState,
} from "@/modules/ai/conversationStateService";
import { evaluateAutomationRules } from "@/modules/ai/aiAutomationRules";
import { executeAiActions } from "@/modules/ai/aiExecuteActions";
import { logAiPipelineEvent } from "@/modules/ai/aiOperationalLogService";
import { getOrCreateTenantOperationalConfig } from "@/modules/operations/tenantOperationalConfigService";
import { bumpMetric, logEvent } from "@/lib/observability";

export async function getOrCreateAiAgentConfig(tenantId: string): Promise<AiAgentConfig> {
  const existing = await prisma.aiAgentConfig.findUnique({ where: { tenantId } });
  if (existing) return existing;
  return prisma.aiAgentConfig.create({
    data: {
      tenantId,
      enabled: false,
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

  const opCfg = await getOrCreateTenantOperationalConfig(tenantId);
  if (!opCfg.aiEnabled) {
    return { ready: false, reason: "operational_ai_paused" };
  }
  if (!opCfg.automationEnabled) {
    return { ready: false, reason: "operational_automation_paused" };
  }

  const bizForLine = businessPhoneNumberId?.trim();
  const channelRow = bizForLine
    ? await prisma.whatsappPhoneNumber.findFirst({
        where: { tenantId, phoneNumberId: bizForLine },
        select: {
          status: true,
          accessToken: true,
          autoReplyEnabled: true,
          aiProfileOverride: true,
        },
      })
    : null;

  if (bizForLine) {
    if (
      !channelRow ||
      channelRow.status !== WhatsappPhoneNumberStatus.ACTIVE ||
      !channelRow.accessToken?.trim()
    ) {
      return { ready: false, reason: "channel_not_active" };
    }
  }

  if (isOpenAiConfigured()) {
    const cfgEarly = await prisma.aiAgentConfig
      .findUnique({ where: { tenantId } })
      .then((c) => c ?? getOrCreateAiAgentConfig(tenantId));
    if (!cfgEarly.enabled) {
      return { ready: false, reason: "ai_disabled" };
    }
    const effectiveAutoEarly = resolveEffectiveAutoReply(
      cfgEarly.autoReply,
      channelRow?.autoReplyEnabled
    );
    if (!effectiveAutoEarly) {
      return { ready: false, reason: "auto_reply_off" };
    }
    if (
      !hasEffectiveAgentPrompt(
        agentPromptInputFromConfigAndChannel(cfgEarly, channelRow?.aiProfileOverride ?? null)
      )
    ) {
      return { ready: false, reason: "empty_prompt" };
    }

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
  const effectiveAuto = resolveEffectiveAutoReply(config.autoReply, channelRow?.autoReplyEnabled);
  if (!effectiveAuto) {
    return { ready: false, reason: "auto_reply_off" };
  }
  if (
    !hasEffectiveAgentPrompt(
      agentPromptInputFromConfigAndChannel(config, channelRow?.aiProfileOverride ?? null)
    )
  ) {
    return { ready: false, reason: "empty_prompt" };
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

  const effectiveDriver = resolveEffectiveDriver(tenant?.aiDriver, config.runtimeDriver);
  const kind = tenantDriverToProviderKind(effectiveDriver);
  if (!kind) {
    return { ready: false, reason: "no_llm_driver" };
  }
  if (!isProviderConfigured(kind)) {
    return { ready: false, reason: "no_api_key" };
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
  /** Correlaciona com logs do webhook (`X-Trace-Id`). */
  traceId?: string;
}

export async function runTenantAiAutoReply(input: RunTenantAiAutoReplyInput): Promise<void> {
  const { tenant, message, inboxThreadId, textBody, traceId: pipelineTraceId } = input;
  const tenantId = tenant.id;
  const from = message.from;
  const waMsgId = message.id;

  if (tenantId === "env") return;
  if (
    tenant.channelStatus !== WhatsappPhoneNumberStatus.ACTIVE ||
    !tenant.accessToken?.trim()
  ) {
    return;
  }

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

  bumpMetric("ai_auto_reply_started");
  logEvent(
    "info",
    "automation",
    "ai_auto_reply_pipeline_start",
    { inbound_wa_message_id: waMsgId, inbox_thread_id: inboxThreadId },
    { trace_id: pipelineTraceId, tenant_id: tenantId }
  );

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

  const thread = await prisma.waInboxThread.findUnique({
    where: {
      tenantId_phoneNumber_businessPhoneNumberId: {
        tenantId,
        phoneNumber: digitsOnly(from),
        businessPhoneNumberId: tenant.phoneNumberId,
      },
    },
    select: {
      id: true,
      assignedToUserId: true,
      status: true,
      aiState: true,
      leadScore: true,
    },
  });
  if (!thread) return;

  const config = await prisma.aiAgentConfig
    .findUnique({ where: { tenantId } })
    .then((c) => c ?? getOrCreateAiAgentConfig(tenantId));

  const channelForAi = await prisma.whatsappPhoneNumber.findFirst({
    where: { tenantId, phoneNumberId: tenant.phoneNumberId },
    select: { autoReplyEnabled: true, aiProfileOverride: true },
  });
  const effectiveConfig = {
    ...config,
    autoReply: resolveEffectiveAutoReply(config.autoReply, channelForAi?.autoReplyEnabled),
  };
  const agentPromptInput = agentPromptInputFromConfigAndChannel(
    config,
    channelForAi?.aiProfileOverride ?? null
  );

  const inboundCount = await countInboundTextMessages(tenantId, thread.id);
  const playbook: AiPlaybookState = resolveNextState({
    previousState: thread.aiState,
    inboundTextCount: inboundCount,
    lastInboundText: textBody,
  });
  await persistThreadAiStateIfChanged(thread.id, playbook, thread.aiState);

  const playbookOverlay = parsePlaybookJson(config.playbookJson);

  const decision = shouldAiReply({
    messageText: textBody,
    config: effectiveConfig,
    thread: {
      id: thread.id,
      assignedToUserId: thread.assignedToUserId,
      status: thread.status,
    },
  });

  if (!decision.allow) {
    await logAiPipelineEvent({
      tenantId,
      waInboxThreadId: thread.id,
      inboundWaMessageId: waMsgId,
      promptUsed: "",
      responseGenerated: "",
      tokensUsed: null,
      durationMs: null,
      eventKind: "blocked_by_guard",
      decisionReason: decision.reason,
      aiStateSnapshot: playbook,
      leadScoreSnapshot: thread.leadScore,
    });
    return;
  }

  const rules = evaluateAutomationRules({
    messageText: textBody,
    aiState: playbook,
    config: effectiveConfig,
  });

  if (rules.shortCircuitReply) {
    const effDriver = isStandalone
      ? "openAI"
      : (await prisma.tenant.findUnique({ where: { id: tenantId }, select: { aiDriver: true } }))?.aiDriver;
    const eff = resolveEffectiveDriver(effDriver ?? null, config.runtimeDriver);
    const pk = eff === "openAI" ? "openai" : eff === "claude" ? "anthropic" : null;
    const modelUsedBase = config.model ?? openAiConfig.model;
    const ok = await executeAiActions({
      tenant,
      tenantId,
      threadId: thread.id,
      inboxThreadId,
      customerPhoneE164: from,
      inboundWaMessageId: waMsgId,
      replyText: rules.shortCircuitReply,
      aiStateSnapshot: playbook,
      decisionReason: "automation:short_greeting",
      modelUsed: modelUsedBase,
      providerKind: pk,
      leadScoreSnapshot: thread.leadScore,
      traceId: pipelineTraceId,
    });
    if (ok.ok) {
      trackAiUsage(tenantId, "AI_SUCCESS", 0);
      trackUsage(tenantId, UsageEventType.AI_RESPONSE, {
        metadata: { threadId: thread.id, inboundWaMessageId: waMsgId, source: "automation_rule" },
      });
    }
    return;
  }

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
    contextMessages.push({
      role: m.direction === WaInboxDirection.INBOUND ? "user" : "assistant",
      content: t,
    });
  }

  const promptOpts = {
    conversationState: playbook,
    recentSummary: buildRecentMessagesSummary(contextMessages, 3),
    playbookOverlay,
    promptAugmentation: rules.promptAugmentation,
  };
  const systemPrompt = buildAgentSystemPrompt(agentPromptInput, promptOpts);
  const modelUsedBase = config.model ?? openAiConfig.model;

  if (isStandalone) {
    const gen: GenerateReplyOutput = await generateOpenAiReply({
      message: textBody,
      contextMessages,
      systemPrompt,
      model: modelUsedBase,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      useStructuredOutput: false,
    });

    if (gen.fallback || gen.error || !gen.reply?.trim()) {
      trackAiUsage(tenantId, "AI_FALLBACK");
      await logAiPipelineEvent({
        tenantId,
        waInboxThreadId: thread.id,
        inboundWaMessageId: waMsgId,
        promptUsed: "",
        responseGenerated: "",
        tokensUsed: gen.tokensUsed,
        durationMs: gen.durationMs,
        errorMessage: gen.error?.slice(0, 2000) ?? null,
        eventKind: "fallback",
        modelUsed: modelUsedBase,
        providerKind: "openai",
        aiStateSnapshot: playbook,
        leadScoreSnapshot: thread.leadScore,
      });
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
      traceId: pipelineTraceId,
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

    await logAiPipelineEvent({
      tenantId,
      waInboxThreadId: thread.id,
      inboundWaMessageId: waMsgId,
      outboundWaMessageId: sendResult.messageId,
      promptUsed: "",
      responseGenerated: gen.reply,
      tokensUsed: gen.tokensUsed,
      durationMs: gen.durationMs,
      eventKind: "auto_reply",
      modelUsed: modelUsedBase,
      providerKind: "openai",
      aiStateSnapshot: playbook,
      leadScoreSnapshot: thread.leadScore,
    });
    return;
  }

  const tenantRow = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { aiDriver: true },
  });

  const effDriver = resolveEffectiveDriver(tenantRow?.aiDriver, config.runtimeDriver);
  const providerKind =
    effDriver === "openAI" ? "openai" : effDriver === "claude" ? "anthropic" : null;

  const gen = await generateReply({
    tenantId,
    conversationId: inboxThreadId,
    messageText: textBody,
    contextMessages,
    systemPrompt,
    model: modelUsedBase,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    aiDriver: effDriver,
  });

  if (gen.error || !gen.text) {
    trackAiUsage(tenantId, "AI_FALLBACK");
    await logAiPipelineEvent({
      tenantId,
      waInboxThreadId: thread.id,
      inboundWaMessageId: waMsgId,
      promptUsed: gen.promptUsed || "(vazio)",
      responseGenerated: "",
      tokensUsed: gen.tokensUsed,
      durationMs: gen.durationMs,
      errorMessage: (gen.error ?? "unknown").slice(0, 2000),
      eventKind: "error",
      modelUsed: modelUsedBase,
      providerKind,
      aiStateSnapshot: playbook,
      leadScoreSnapshot: thread.leadScore,
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
      traceId: pipelineTraceId,
    });
    if (!sendResult.ok) return;
    const outboundWaId = sendResult.messageId;

    await logAiPipelineEvent({
      tenantId,
      waInboxThreadId: thread.id,
      inboundWaMessageId: waMsgId,
      outboundWaMessageId: outboundWaId,
      promptUsed: gen.promptUsed,
      responseGenerated: gen.text,
      tokensUsed: gen.tokensUsed,
      durationMs: gen.durationMs,
      eventKind: "auto_reply",
      modelUsed: modelUsedBase,
      providerKind,
      aiStateSnapshot: playbook,
      leadScoreSnapshot: thread.leadScore,
    });
    trackUsage(tenantId, UsageEventType.AI_RESPONSE, {
      metadata: { threadId: thread.id, inboundWaMessageId: waMsgId },
    });
  } catch (e) {
    await logAiPipelineEvent({
      tenantId,
      waInboxThreadId: thread.id,
      inboundWaMessageId: waMsgId,
      promptUsed: gen.promptUsed,
      responseGenerated: gen.text,
      tokensUsed: gen.tokensUsed,
      durationMs: gen.durationMs,
      errorMessage: (e instanceof Error ? e.message : String(e)).slice(0, 2000),
      eventKind: "error",
      modelUsed: modelUsedBase,
      providerKind,
      aiStateSnapshot: playbook,
      leadScoreSnapshot: thread.leadScore,
    });
    throw e;
  }
}
