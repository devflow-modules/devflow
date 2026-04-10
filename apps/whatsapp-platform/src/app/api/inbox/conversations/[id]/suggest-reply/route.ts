import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { WaInboxDirection, WaInboxMsgType, UsageEventType } from "@/generated/prisma-whatsapp";
import { getOrCreateAiAgentConfig } from "@/modules/ai/aiAutomationService";
import { generateReply } from "@/modules/ai/aiService";
import { openAiConfig } from "@/modules/ai/openai";
import {
  agentPromptInputFromConfig,
  buildAgentSystemPrompt,
} from "@/modules/ai/prompt/agentSystemPrompt";
import { resolveEffectiveDriver } from "@/modules/ai/resolveAiRuntimeConfig";
import { waInboxListMessages } from "@/modules/inbox";
import { enforceUsageOrThrow, UsageLimitExceededError } from "@/modules/billing/enforcementService";
import { trackUsage } from "@/modules/billing/usageService";
import { trackAiUsage } from "@/modules/ai/aiUsageService";
import { logEvent, logError } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  const { id: threadId } = await context.params;
  if (!threadId?.trim()) {
    return NextResponse.json({ success: false, error: "id obrigatório" }, { status: 400 });
  }

  const tenantId = auth.payload.tenantId;

  try {
    await enforceUsageOrThrow({ tenantId, feature: "ai", quantity: 1 });
  } catch (e) {
    if (e instanceof UsageLimitExceededError) {
      return NextResponse.json(
        { success: false, error: { message: e.message, code: e.code } },
        { status: 402 }
      );
    }
    throw e;
  }

  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
  });
  if (!thread) {
    return NextResponse.json({ success: false, error: "Conversa não encontrada" }, { status: 404 });
  }

  const rows = await waInboxListMessages(tenantId, threadId, { take: 32 });
  if (!rows) {
    return NextResponse.json({ success: false, error: "Conversa não encontrada" }, { status: 404 });
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
    "Com base no histórico acima, escreva somente o texto da próxima mensagem de WhatsApp para o cliente (português do Brasil). " +
    "Seja objetivo e cordial. Não use Markdown nem envolva a resposta em aspas.";

  try {
    const gen = await generateReply({
      tenantId,
      conversationId: threadId,
      messageText: instruction,
      contextMessages,
      systemPrompt: buildAgentSystemPrompt(agentPromptInputFromConfig(config)),
      model: config.model ?? openAiConfig.model,
      maxTokens: Math.min(config.maxTokens ?? openAiConfig.maxTokens, 400),
      temperature: config.temperature,
      aiDriver: resolveEffectiveDriver(tenantRow?.aiDriver, config.runtimeDriver),
    });

    if (gen.error || !gen.text?.trim()) {
      logEvent("warn", "inbox", "suggest_reply_failed", {
        tenantId,
        threadId,
        err: gen.error ?? "empty",
      });
      return NextResponse.json(
        {
          success: false,
          error: { message: gen.error ?? "Não foi possível gerar uma sugestão" },
        },
        { status: 502 }
      );
    }

    trackUsage(tenantId, UsageEventType.AI_RESPONSE, {
      metadata: { source: "inbox_suggest_reply", threadId },
    });
    trackAiUsage(tenantId, "AI_SUCCESS", gen.tokensUsed ?? 0);

    logEvent("info", "inbox", "suggest_reply_ok", { tenantId, threadId });

    return NextResponse.json({
      success: true,
      data: { text: gen.text.trim(), tokensUsed: gen.tokensUsed, durationMs: gen.durationMs },
    });
  } catch (e) {
    logError("inbox", e, { route: "suggest_reply", threadId });
    return NextResponse.json(
      {
        success: false,
        error: { message: e instanceof Error ? e.message : "Erro ao gerar sugestão" },
      },
      { status: 502 }
    );
  }
}
