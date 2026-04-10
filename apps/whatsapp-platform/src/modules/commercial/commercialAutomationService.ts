import {
  WaInboxDirection,
  WaInboxThreadPriority,
  WaInboxThreadStatus,
} from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";
import { parseOutboundKindFromContentJson } from "@/modules/messaging/automaticReplyGuard";
import { sendWebhookAutoReply } from "@/modules/messaging/sendMessageService";
import { resolveTenantByPhoneNumberId } from "@/modules/tenants";
import { generateReply as generateOpenAiReply, isOpenAiConfigured } from "@/modules/ai/openaiReplyService";
import { logAiPipelineEvent } from "@/modules/ai/aiOperationalLogService";
import { openAiConfig } from "@/modules/ai/openai";
import type { WaInboxThreadInboxMetrics } from "@/modules/inbox/waInboxThreadMetrics";
import { parseLeadDataJson } from "./leadDataUtils";
import {
  COMMERCIAL_TASK_TYPES,
  FOLLOWUP_DELAY_HIGH_MS,
  FOLLOWUP_DELAY_MEDIUM_MS,
  FOLLOWUP_DELAY_NEGOTIATING_IDLE_MS,
  MAX_FOLLOWUP_RECOVERY_PER_THREAD,
  MAX_REACTIVATIONS_PER_24H,
  MIN_COMMERCIAL_INTERVAL_MS,
  RECOVERY_SCHEDULE_DELAY_MS,
  REACTIVATION_DELAY_AFTER_IDLE_MS,
} from "./commercialAutomationConstants";

export { COMMERCIAL_TASK_TYPES } from "./commercialAutomationConstants";

/** Frases de hesitação — recuperação de vendas */
const RECOVERY_PHRASES =
  /\b(?:vou\s+pensar|preciso\s+pensar|depois\s+vejo|depois\s+eu\s+vejo|n[aã]o\s+sei|tenho\s+que\s+pensar|deixa\s+eu\s+pensar)\b/i;

export function detectRecoveryKeywords(message: string): boolean {
  const t = message.trim();
  if (!t) return false;
  return RECOVERY_PHRASES.test(t.toLowerCase());
}

async function countExecutedFollowupRecovery(threadId: string): Promise<number> {
  return prisma.followUpTask.count({
    where: {
      conversationId: threadId,
      executed: true,
      type: { in: [COMMERCIAL_TASK_TYPES.FOLLOWUP, COMMERCIAL_TASK_TYPES.RECOVERY] },
    },
  });
}

async function countReactivationsLast24h(threadId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.followUpTask.count({
    where: {
      conversationId: threadId,
      executed: true,
      type: COMMERCIAL_TASK_TYPES.REACTIVATION,
      createdAt: { gte: since },
    },
  });
}

async function hasPendingTask(threadId: string, type: string): Promise<boolean> {
  const n = await prisma.followUpTask.count({
    where: { conversationId: threadId, executed: false, type },
  });
  return n > 0;
}

/**
 * Agente humano respondeu após a última inbound (bloqueia automação comercial).
 */
export async function humanAgentRepliedAfterLastInbound(
  tenantId: string,
  threadId: string
): Promise<boolean> {
  const lastInbound = await prisma.waInboxMessage.findFirst({
    where: { tenantId, threadId, direction: WaInboxDirection.INBOUND },
    orderBy: [{ ts: "desc" }, { id: "desc" }],
    select: { ts: true },
  });
  if (!lastInbound) return false;
  const outAfter = await prisma.waInboxMessage.findFirst({
    where: {
      tenantId,
      threadId,
      direction: WaInboxDirection.OUTBOUND,
      ts: { gte: lastInbound.ts },
    },
    orderBy: [{ ts: "desc" }, { id: "desc" }],
    select: { contentJson: true, ts: true },
  });
  if (!outAfter) return false;
  return parseOutboundKindFromContentJson(outAfter.contentJson) === "agent";
}

function alignScheduledAt(base: Date, lastCommercial: Date | null): Date {
  if (!lastCommercial) return base;
  const minNext = new Date(lastCommercial.getTime() + MIN_COMMERCIAL_INTERVAL_MS);
  return base.getTime() > minNext.getTime() ? base : minNext;
}

async function upsertPendingTask(params: {
  tenantId: string;
  threadId: string;
  type: string;
  scheduledAt: Date;
}): Promise<void> {
  const { tenantId, threadId, type, scheduledAt } = params;
  const existing = await prisma.followUpTask.findFirst({
    where: { conversationId: threadId, executed: false, type },
    orderBy: { scheduledAt: "asc" },
  });
  if (existing) {
    const next = new Date(Math.min(existing.scheduledAt.getTime(), scheduledAt.getTime()));
    if (next.getTime() !== existing.scheduledAt.getTime()) {
      await prisma.followUpTask.update({
        where: { id: existing.id },
        data: { scheduledAt: next },
      });
    }
    return;
  }
  await prisma.followUpTask.create({
    data: {
      tenantId,
      conversationId: threadId,
      type,
      scheduledAt,
      executed: false,
    },
  });
}

export type ScheduleFollowUpContext = {
  tenantId: string;
  threadId: string;
  /** Milissegundos a partir de agora (ou será alinhado ao intervalo mínimo) */
  delayMs: number;
};

/**
 * Agenda follow-up genérico (uso interno e extensível).
 */
export async function scheduleFollowUp(context: ScheduleFollowUpContext): Promise<boolean> {
  const { tenantId, threadId, delayMs } = context;
  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: { lastCommercialMsgAt: true, status: true, assignedToUserId: true },
  });
  if (!thread) return false;
  if (thread.status !== WaInboxThreadStatus.OPEN || thread.assignedToUserId) return false;

  if ((await countExecutedFollowupRecovery(threadId)) >= MAX_FOLLOWUP_RECOVERY_PER_THREAD) {
    return false;
  }

  const base = new Date(Date.now() + delayMs);
  const scheduledAt = alignScheduledAt(base, thread.lastCommercialMsgAt);
  await upsertPendingTask({
    tenantId,
    threadId,
    type: COMMERCIAL_TASK_TYPES.FOLLOWUP,
    scheduledAt,
  });
  return true;
}

/**
 * Reativação de lead (ex.: HIGH inativo 24h).
 */
export async function scheduleReactivation(conversation: {
  id: string;
  tenantId: string;
}): Promise<boolean> {
  const { id: threadId, tenantId } = conversation;
  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: { lastCommercialMsgAt: true, status: true, assignedToUserId: true, lastMessageAt: true },
  });
  if (!thread) return false;
  if (thread.status !== WaInboxThreadStatus.OPEN || thread.assignedToUserId) return false;
  if ((await countReactivationsLast24h(threadId)) >= MAX_REACTIVATIONS_PER_24H) return false;
  if (await hasPendingTask(threadId, COMMERCIAL_TASK_TYPES.REACTIVATION)) return false;

  const base = new Date(Date.now() + 60_000);
  const scheduledAt = alignScheduledAt(base, thread.lastCommercialMsgAt);
  await prisma.followUpTask.create({
    data: {
      tenantId,
      conversationId: threadId,
      type: COMMERCIAL_TASK_TYPES.REACTIVATION,
      scheduledAt,
      executed: false,
    },
  });
  return true;
}

async function scheduleRecoveryTask(tenantId: string, threadId: string): Promise<void> {
  if ((await countExecutedFollowupRecovery(threadId)) >= MAX_FOLLOWUP_RECOVERY_PER_THREAD) return;
  if (await hasPendingTask(threadId, COMMERCIAL_TASK_TYPES.RECOVERY)) return;

  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: { lastCommercialMsgAt: true },
  });
  if (!thread) return;

  const base = new Date(Date.now() + RECOVERY_SCHEDULE_DELAY_MS);
  const scheduledAt = alignScheduledAt(base, thread.lastCommercialMsgAt);
  await upsertPendingTask({
    tenantId,
    threadId,
    type: COMMERCIAL_TASK_TYPES.RECOVERY,
    scheduledAt,
  });
}

/**
 * Chamado após inbound + CRM: recovery, follow-up por prioridade / fila.
 */
export async function evaluateCommercialPipelineAfterInbound(params: {
  tenantId: string;
  threadId: string;
  inboundText: string;
  inboxMetrics: WaInboxThreadInboxMetrics | null;
}): Promise<void> {
  const { tenantId, threadId, inboundText, inboxMetrics } = params;

  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: {
      priority: true,
      aiState: true,
      status: true,
      assignedToUserId: true,
      leadData: true,
    },
  });
  if (!thread || thread.status !== WaInboxThreadStatus.OPEN || thread.assignedToUserId) return;

  if (detectRecoveryKeywords(inboundText)) {
    await prisma.waInboxThread.update({
      where: { id: threadId },
      data: { needsRecovery: true },
    });
    await scheduleRecoveryTask(tenantId, threadId);
  }

  const unanswered = inboxMetrics?.unansweredInboundCount ?? 0;
  if (unanswered === 0) return;

  if (thread.priority === WaInboxThreadPriority.LOW) return;

  if (await humanAgentRepliedAfterLastInbound(tenantId, threadId)) return;

  if ((await countExecutedFollowupRecovery(threadId)) >= MAX_FOLLOWUP_RECOVERY_PER_THREAD) return;

  let delayMs = FOLLOWUP_DELAY_MEDIUM_MS;
  if (thread.priority === WaInboxThreadPriority.HIGH) delayMs = FOLLOWUP_DELAY_HIGH_MS;
  else delayMs = FOLLOWUP_DELAY_MEDIUM_MS;

  await scheduleFollowUp({ tenantId, threadId, delayMs });
}

async function loadRecentContext(tenantId: string, threadId: string) {
  const recent = await prisma.waInboxMessage.findMany({
    where: { tenantId, threadId, messageType: "TEXT" },
    orderBy: { ts: "desc" },
    take: 12,
    select: { direction: true, contentText: true },
  });
  const chronological = [...recent].reverse();
  const contextMessages: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of chronological) {
    const t = m.contentText?.trim();
    if (!t) continue;
    contextMessages.push({
      role: m.direction === WaInboxDirection.INBOUND ? "user" : "assistant",
      content: t.slice(0, 800),
    });
  }
  return contextMessages;
}

function systemPromptForTask(type: string, needsRecovery: boolean): string {
  if (type === COMMERCIAL_TASK_TYPES.RECOVERY || needsRecovery) {
    return [
      "És um assistente comercial no WhatsApp.",
      "O cliente mostrou hesitação. Responde com UMA mensagem curta em português.",
      "Reforça valor e proximidade, sem pressão nem desconto agressivo.",
      "Convida a um próximo passo concreto (pergunta ou opção).",
    ].join(" ");
  }
  if (type === COMMERCIAL_TASK_TYPES.REACTIVATION) {
    return [
      "És um assistente comercial no WhatsApp.",
      "O cliente esteve inactivo. Uma mensagem curta, leve e não invasiva em português.",
      "Ex.: perguntar se ainda precisa de ajuda ou se quer continuar a conversa.",
    ].join(" ");
  }
  return [
    "És um assistente comercial no WhatsApp.",
    "Retoma a conversa de forma natural e incentiva continuidade.",
    "Uma mensagem curta em português, tom profissional e próximo.",
  ].join(" ");
}

function fallbackMessage(type: string): string {
  if (type === COMMERCIAL_TASK_TYPES.REACTIVATION) {
    return "Olá! Passo só para saber se ainda precisa de ajuda ou se quer continuar a nossa conversa.";
  }
  if (type === COMMERCIAL_TASK_TYPES.RECOVERY) {
    return "Obrigado pelo retorno! Se quiser, posso ajudar a comparar opções ou tirar dúvidas — o que faz mais sentido para si agora?";
  }
  return "Olá! Queria retomar o nosso contacto — posso ajudar em mais alguma coisa?";
}

async function generateCommercialText(params: {
  tenantId: string;
  threadId: string;
  taskType: string;
  needsRecoveryFlag: boolean;
}): Promise<{ text: string; tokens: number | null; durationMs: number }> {
  const { tenantId, threadId, taskType, needsRecoveryFlag } = params;
  const contextMessages = await loadRecentContext(tenantId, threadId);
  const systemPrompt = systemPromptForTask(taskType, needsRecoveryFlag);
  const userLine =
    "Gera apenas o texto da mensagem a enviar ao cliente (sem prefixos nem markdown).";

  if (!isOpenAiConfigured()) {
    return { text: fallbackMessage(taskType), tokens: null, durationMs: 0 };
  }

  const cfg = await prisma.aiAgentConfig.findUnique({ where: { tenantId } });
  const modelUsed = cfg?.model ?? openAiConfig.model;
  const gen = await generateOpenAiReply({
    message: userLine,
    contextMessages,
    systemPrompt,
    model: modelUsed,
    maxTokens: Math.min(cfg?.maxTokens ?? 400, 400),
    temperature: Math.min(cfg?.temperature ?? 0.6, 0.7),
    useStructuredOutput: false,
  });

  if (gen.fallback || gen.error || !gen.reply?.trim()) {
    return {
      text: fallbackMessage(taskType),
      tokens: gen.tokensUsed,
      durationMs: gen.durationMs,
    };
  }
  return {
    text: gen.reply.trim().slice(0, 1200),
    tokens: gen.tokensUsed,
    durationMs: gen.durationMs,
  };
}

type ThreadSendSnapshot = {
  phoneNumber: string;
  businessPhoneNumberId: string;
  leadScore: number;
  needsRecovery: boolean;
};

async function validateThreadForExecution(
  tenantId: string,
  threadId: string
): Promise<
  | { canSend: true; thread: ThreadSendSnapshot }
  | { canSend: false; deferMs?: number }
> {
  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: {
      phoneNumber: true,
      businessPhoneNumberId: true,
      leadScore: true,
      needsRecovery: true,
      status: true,
      assignedToUserId: true,
      lastCommercialMsgAt: true,
    },
  });
  if (!thread) return { canSend: false };
  if (thread.status !== WaInboxThreadStatus.OPEN || thread.assignedToUserId) return { canSend: false };
  const now = Date.now();
  if (thread.lastCommercialMsgAt) {
    const elapsed = now - thread.lastCommercialMsgAt.getTime();
    if (elapsed < MIN_COMMERCIAL_INTERVAL_MS) {
      return { canSend: false, deferMs: MIN_COMMERCIAL_INTERVAL_MS - elapsed };
    }
  }
  return {
    canSend: true,
    thread: {
      phoneNumber: thread.phoneNumber,
      businessPhoneNumberId: thread.businessPhoneNumberId,
      leadScore: thread.leadScore,
      needsRecovery: thread.needsRecovery,
    },
  };
}

/**
 * Processa tarefas agendadas (cron).
 */
export async function processFollowUps(opts?: { limit?: number }): Promise<{
  processed: number;
  skipped: number;
  errors: number;
}> {
  const limit = Math.min(50, Math.max(1, opts?.limit ?? 25));
  const now = new Date();
  const tasks = await prisma.followUpTask.findMany({
    where: { executed: false, scheduledAt: { lte: now } },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const task of tasks) {
    try {
      const v = await validateThreadForExecution(task.tenantId, task.conversationId);
      if (!v.canSend) {
        if (v.deferMs != null) {
          await prisma.followUpTask.update({
            where: { id: task.id },
            data: { scheduledAt: new Date(Date.now() + Math.max(v.deferMs, 60_000)) },
          });
        } else {
          await prisma.followUpTask.update({
            where: { id: task.id },
            data: { executed: true },
          });
        }
        skipped += 1;
        continue;
      }

      if (task.type !== COMMERCIAL_TASK_TYPES.REACTIVATION) {
        if ((await humanAgentRepliedAfterLastInbound(task.tenantId, task.conversationId))) {
          await prisma.followUpTask.update({ where: { id: task.id }, data: { executed: true } });
          skipped += 1;
          continue;
        }
      }

      if (task.type === COMMERCIAL_TASK_TYPES.FOLLOWUP || task.type === COMMERCIAL_TASK_TYPES.RECOVERY) {
        const n = await countExecutedFollowupRecovery(task.conversationId);
        if (n >= MAX_FOLLOWUP_RECOVERY_PER_THREAD) {
          await prisma.followUpTask.update({ where: { id: task.id }, data: { executed: true } });
          skipped += 1;
          continue;
        }
      }

      const tenant = await resolveTenantByPhoneNumberId(v.thread.businessPhoneNumberId);
      if (!tenant) {
        await prisma.followUpTask.update({ where: { id: task.id }, data: { executed: true } });
        skipped += 1;
        continue;
      }

      const gen = await generateCommercialText({
        tenantId: task.tenantId,
        threadId: task.conversationId,
        taskType: task.type,
        needsRecoveryFlag: v.thread.needsRecovery && task.type === COMMERCIAL_TASK_TYPES.RECOVERY,
      });

      const toPhone = v.thread.phoneNumber.startsWith("+")
        ? v.thread.phoneNumber
        : `+${v.thread.phoneNumber}`;

      const send = await sendWebhookAutoReply({
        tenant,
        to: toPhone,
        inboxThreadId: task.conversationId,
        text: gen.text,
        outboundKind: "automation",
      });

      if (!send.ok) {
        await prisma.followUpTask.update({ where: { id: task.id }, data: { executed: true } });
        skipped += 1;
        continue;
      }

      await prisma.$transaction([
        prisma.followUpTask.update({
          where: { id: task.id },
          data: { executed: true },
        }),
        prisma.waInboxThread.update({
          where: { id: task.conversationId },
          data: {
            commercialMsgCount: { increment: 1 },
            lastCommercialMsgAt: new Date(),
            ...(task.type === COMMERCIAL_TASK_TYPES.RECOVERY ? { needsRecovery: false } : {}),
          },
        }),
      ]);

      await logAiPipelineEvent({
        tenantId: task.tenantId,
        waInboxThreadId: task.conversationId,
        inboundWaMessageId: null,
        outboundWaMessageId: send.messageId,
        promptUsed: systemPromptForTask(task.type, v.thread.needsRecovery).slice(0, 8000),
        responseGenerated: gen.text,
        tokensUsed: gen.tokens,
        durationMs: gen.durationMs,
        eventKind: "auto_reply",
        decisionReason: `commercial_automation:${task.type}`,
        modelUsed: openAiConfig.model,
        providerKind: isOpenAiConfigured() ? "openai" : null,
        aiStateSnapshot: null,
        leadScoreSnapshot: v.thread.leadScore,
      });

      processed += 1;
    } catch {
      errors += 1;
    }
  }

  await scanIdleNegotiationsAndHighReactivations();

  return { processed, skipped, errors };
}

/**
 * Negociação parada (última mensagem outbound há >30min) e reativação HIGH inactivo 24h.
 */
export async function scanIdleNegotiationsAndHighReactivations(): Promise<void> {
  const negotiatingCutoff = new Date(Date.now() - FOLLOWUP_DELAY_NEGOTIATING_IDLE_MS);
  const highInactiveCutoff = new Date(Date.now() - REACTIVATION_DELAY_AFTER_IDLE_MS);

  const idleNegotiating = await prisma.waInboxThread.findMany({
    where: {
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
      aiState: "negotiating",
      lastMessageAt: { lt: negotiatingCutoff },
    },
    select: { id: true, tenantId: true, lastCommercialMsgAt: true },
    take: 30,
  });

  for (const row of idleNegotiating) {
    const last = await prisma.waInboxMessage.findFirst({
      where: { threadId: row.id, tenantId: row.tenantId },
      orderBy: { ts: "desc" },
      select: { direction: true },
    });
    if (last?.direction !== WaInboxDirection.OUTBOUND) continue;
    if (await hasPendingTask(row.id, COMMERCIAL_TASK_TYPES.FOLLOWUP)) continue;
    if ((await countExecutedFollowupRecovery(row.id)) >= MAX_FOLLOWUP_RECOVERY_PER_THREAD) continue;

    const base = new Date(Date.now() + 60_000);
    const scheduledAt = alignScheduledAt(base, row.lastCommercialMsgAt);
    await upsertPendingTask({
      tenantId: row.tenantId,
      threadId: row.id,
      type: COMMERCIAL_TASK_TYPES.FOLLOWUP,
      scheduledAt,
    });
  }

  const highInactive = await prisma.waInboxThread.findMany({
    where: {
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
      priority: WaInboxThreadPriority.HIGH,
      lastMessageAt: { lt: highInactiveCutoff },
    },
    select: { id: true, tenantId: true },
    take: 20,
  });

  for (const row of highInactive) {
    await scheduleReactivation({ id: row.id, tenantId: row.tenantId });
  }

  const interestStale = await prisma.waInboxThread.findMany({
    where: {
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
      aiState: { in: ["qualifying", "negotiating"] },
      lastMessageAt: { lt: highInactiveCutoff },
    },
    select: { id: true, tenantId: true, leadData: true },
    take: 20,
  });

  for (const row of interestStale) {
    const ld = parseLeadDataJson(row.leadData);
    const interestPrice =
      ld.interest && /pre[çc]o|or[çc]amento|valor/i.test(ld.interest);
    if (!ld.budget && !interestPrice) continue;
    await scheduleReactivation({ id: row.id, tenantId: row.tenantId });
  }
}
