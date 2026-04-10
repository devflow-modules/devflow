import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateAiAgentConfig } from "@/modules/ai/aiAutomationService";
import {
  mergeAgentConfigDraft,
  runAiConfigTestSimulation,
  type AiTestSimulationResult,
} from "@/modules/ai/aiTestSimulation";
import { aiTestRateLimitKey, allowAiTestRequest } from "@/lib/aiTestRateLimit";
import { aiConfigPutSchema } from "@/modules/ai/schemas/aiConfigSchemas";
import { trackAiUsage } from "@/modules/ai/aiUsageService";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  message: z.string().min(1).max(4000),
  draft: aiConfigPutSchema.partial().optional(),
});

/** Contrato estável para UI — valores internos (openAI, ruleBased) normalizados. */
export function normalizeAiTestUsedDriver(
  raw: string
): "openai" | "anthropic" | "rules" {
  if (raw === "openAI") return "openai";
  if (raw === "claude") return "anthropic";
  return "rules";
}

export function buildAiTestResponseBody(result: AiTestSimulationResult) {
  return {
    reply: result.reply ?? "",
    decision: {
      allow: result.decision.allow,
      reason: result.decision.reason,
      confidence: result.decision.confidence ?? null,
    },
    state: result.playbookState,
    usedDriver: normalizeAiTestUsedDriver(result.usedDriver),
    usedModel: result.usedModel ?? "",
    latencyMs: Number(result.latencyMs ?? 0),
    fallback: Boolean(result.fallback),
    error: result.error ?? null,
  };
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const tenantId = auth!.payload.tenantId;
  const userId = auth!.payload.sub;

  const key = aiTestRateLimitKey(tenantId, userId);
  if (!allowAiTestRequest(key)) {
    return NextResponse.json(
      { success: false, error: "Muitas simulações. Aguarde um minuto e tente novamente." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [cfg, tenant] = await Promise.all([
    getOrCreateAiAgentConfig(tenantId),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiDriver: true },
    }),
  ]);

  const merged = mergeAgentConfigDraft(cfg, parsed.data.draft);

  const result = await runAiConfigTestSimulation({
    tenantId,
    tenantAiDriver: tenant?.aiDriver ?? null,
    config: merged,
    message: parsed.data.message,
  });

  if (result.error && !result.reply) {
    trackAiUsage(tenantId, "AI_PROVIDER_ERROR", 0);
  } else {
    trackAiUsage(tenantId, "AI_TEST_RUN", 0);
  }

  return NextResponse.json({
    success: true,
    data: buildAiTestResponseBody(result),
  });
}
