import { prisma } from "@/lib/prisma";

export type AiOperationalEventKind =
  | "auto_reply"
  | "fallback"
  | "error"
  | "blocked_by_guard"
  /** legado */
  | "blocked";

/**
 * Registo operacional unificado (métricas + auditoria leve).
 * Nunca incluir segredos em `promptUsed` / `decisionReason`.
 */
export async function logAiPipelineEvent(params: {
  tenantId: string;
  waInboxThreadId: string | null;
  inboundWaMessageId: string | null;
  outboundWaMessageId?: string | null;
  promptUsed: string;
  responseGenerated: string;
  tokensUsed: number | null;
  durationMs: number | null;
  errorMessage?: string | null;
  eventKind: AiOperationalEventKind;
  decisionReason?: string | null;
  modelUsed?: string | null;
  providerKind?: string | null;
  aiStateSnapshot?: string | null;
  leadScoreSnapshot?: number | null;
}): Promise<void> {
  await prisma.aiMessageLog
    .create({
      data: {
        tenantId: params.tenantId,
        waInboxThreadId: params.waInboxThreadId,
        inboundWaMessageId: params.inboundWaMessageId,
        outboundWaMessageId: params.outboundWaMessageId ?? null,
        promptUsed: params.promptUsed,
        responseGenerated: params.responseGenerated,
        tokensUsed: params.tokensUsed,
        durationMs: params.durationMs,
        errorMessage: params.errorMessage ?? null,
        eventKind: params.eventKind,
        decisionReason: params.decisionReason ?? null,
        modelUsed: params.modelUsed ?? null,
        providerKind: params.providerKind ?? null,
        aiStateSnapshot: params.aiStateSnapshot ?? null,
        leadScoreSnapshot: params.leadScoreSnapshot ?? null,
      },
    })
    .catch((e) => console.error("[ai] logAiPipelineEvent failed", e));
}
