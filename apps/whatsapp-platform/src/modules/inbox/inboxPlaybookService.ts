/**
 * Playbook IA: intent + ação recomendada + texto sugerido (JSON estruturado).
 */

import { z } from "zod";
import {
  WaInboxDirection,
  WaInboxMsgType,
  UsageEventType,
  type AiAgentTone,
} from "@/generated/prisma-whatsapp";
import { getOrCreateAiAgentConfig } from "@/modules/ai/aiAutomationService";
import { generateReply } from "@/modules/ai/aiService";
import { openAiConfig } from "@/modules/ai/openai";
import { prisma } from "@/lib/prisma";
import { waInboxListMessages } from "@/modules/inbox/waInboxMessageService";
import { trackUsage } from "@/modules/billing/usageService";
import { trackAiUsage } from "@/modules/ai/aiUsageService";
import { logAction } from "./auditService";

const playbookSchema = z.object({
  intent: z.string().min(1),
  recommendedAction: z.string().min(1),
  suggestedResponse: z.string().min(1),
});

export type InboxPlaybookResult = z.infer<typeof playbookSchema> & {
  tokensUsed: number | null;
  durationMs: number;
};

function extractJsonObject(raw: string): unknown {
  const t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const inner = fence ? fence[1].trim() : t;
  const start = inner.indexOf("{");
  const end = inner.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("JSON não encontrado na resposta");
  }
  return JSON.parse(inner.slice(start, end + 1));
}

export async function suggestInboxPlaybook(params: {
  tenantId: string;
  threadId: string;
  userId: string;
}): Promise<{ ok: true; data: InboxPlaybookResult } | { ok: false; error: string }> {
  const { tenantId, threadId, userId } = params;

  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
  });
  if (!thread) {
    return { ok: false, error: "Conversa não encontrada" };
  }

  const rows = await waInboxListMessages(tenantId, threadId, { take: 40 });
  if (!rows) {
    return { ok: false, error: "Conversa não encontrada" };
  }

  const contextMessages: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of rows) {
    if (m.messageType !== WaInboxMsgType.TEXT) continue;
    const t = m.contentText?.trim();
    if (!t) continue;
    if (m.direction === WaInboxDirection.INBOUND) {
      contextMessages.push({ role: "user", content: t });
    } else {
      contextMessages.push({ role: "assistant", content: t });
    }
  }

  const [config, tenantRow] = await Promise.all([
    getOrCreateAiAgentConfig(tenantId),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiDriver: true },
    }),
  ]);

  const instruction =
    "Analise o histórico acima (WhatsApp). Responda APENAS com um único objeto JSON válido, sem markdown, " +
    "neste formato exato: " +
    '{"intent":"string curta do que o cliente quer","recommendedAction":"o que o agente deve fazer a seguir (operacional)","suggestedResponse":"texto pronto para colar no WhatsApp em pt-BR, cordial e objetivo"}. ' +
    "O campo suggestedResponse deve ser só o texto da mensagem, sem aspas extras.";

  const gen = await generateReply({
    tenantId,
    conversationId: threadId,
    messageText: instruction,
    contextMessages,
    systemPrompt:
      (config.systemPrompt?.trim() || "") +
      "\n\nÉs um assistente de triagem de inbox: devolves apenas JSON.",
    tone: config.tone as AiAgentTone,
    model: config.model ?? openAiConfig.model,
    maxTokens: Math.min(config.maxTokens ?? openAiConfig.maxTokens, 500),
    temperature: Math.min(config.temperature ?? 0.4, 0.7),
    aiDriver: tenantRow?.aiDriver ?? null,
  });

  if (gen.error || !gen.text?.trim()) {
    return { ok: false, error: gen.error ?? "Resposta vazia do modelo" };
  }

  let parsed: z.infer<typeof playbookSchema>;
  try {
    const json = extractJsonObject(gen.text);
    parsed = playbookSchema.parse(json);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "JSON inválido na resposta da IA",
    };
  }

  trackUsage(tenantId, UsageEventType.AI_RESPONSE, {
    metadata: { source: "inbox_suggest_playbook", threadId },
  });
  trackAiUsage(tenantId, "AI_SUCCESS", gen.tokensUsed ?? 0);

  await logAction(tenantId, threadId, userId, "playbook_suggest", {
    intent: parsed.intent.slice(0, 200),
  });

  return {
    ok: true,
    data: {
      ...parsed,
      tokensUsed: gen.tokensUsed ?? null,
      durationMs: gen.durationMs,
    },
  };
}
