import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateAiAgentConfig } from "@/modules/ai/aiAutomationService";
import { aiAgentConfigToApiResponse } from "@/modules/ai/aiConfigMapping";
import { mergeAgentConfigDraft } from "@/modules/ai/aiTestSimulation";
import {
  agentPromptInputFromConfig,
  hasEffectiveAgentPrompt,
} from "@/modules/ai/prompt/agentSystemPrompt";
import {
  aiConfigPutSchema,
  clampNumber,
  normalizeAiConfigPartial,
  validateModelForDriver,
} from "@/modules/ai/schemas/aiConfigSchemas";
import { resolveEffectiveDriver } from "@/modules/ai/resolveAiRuntimeConfig";
import { AI_BEHAVIOR_PRESETS } from "@/modules/ai/aiPresets";
import { requireFeatureOr403 } from "@/modules/billing/featureGate";
import { aiRuntimeRequiresAdvancedAi } from "@/modules/ai/aiFeatureGating";

export const dynamic = "force-dynamic";

const patchSchema = aiConfigPutSchema.partial();

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const tenantId = auth!.payload.tenantId;
  const [cfg, tenant] = await Promise.all([
    getOrCreateAiAgentConfig(tenantId),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiDriver: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: aiAgentConfigToApiResponse(cfg, tenant?.aiDriver ?? null),
    presets: AI_BEHAVIOR_PRESETS,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const tenantId = auth!.payload.tenantId;
  const userId = auth!.payload.sub;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let patch = normalizeAiConfigPartial(parsed.data);
  if (patch.maxTokens !== undefined) {
    patch = { ...patch, maxTokens: clampNumber(patch.maxTokens, 50, 500) };
  }
  if (patch.temperature !== undefined) {
    patch = { ...patch, temperature: clampNumber(patch.temperature, 0, 1) };
  }

  await getOrCreateAiAgentConfig(tenantId);

  const [existing, tenant] = await Promise.all([
    prisma.aiAgentConfig.findUnique({ where: { tenantId } }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiDriver: true },
    }),
  ]);

  if (!existing) {
    return NextResponse.json({ success: false, error: "Configuração não encontrada" }, { status: 404 });
  }

  const mergedVirtual = mergeAgentConfigDraft(existing, patch);
  if (mergedVirtual.enabled && !hasEffectiveAgentPrompt(agentPromptInputFromConfig(mergedVirtual))) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Com a IA ativada, preencha pelo menos um campo de comportamento: identidade, contexto do negócio, objetivo, regras, tópicos a evitar ou gatilhos de handoff.",
      },
      { status: 400 }
    );
  }

  const effectiveDriver = resolveEffectiveDriver(tenant?.aiDriver, mergedVirtual.runtimeDriver);
  const modelToCheck = mergedVirtual.model?.trim() || "gpt-4o-mini";
  if (!validateModelForDriver(effectiveDriver, modelToCheck)) {
    return NextResponse.json(
      { success: false, error: "Modelo incompatível com o motor selecionado." },
      { status: 400 }
    );
  }

  if (
    aiRuntimeRequiresAdvancedAi({
      effectiveDriver,
      model: modelToCheck,
    })
  ) {
    const blocked = await requireFeatureOr403(tenantId, "ADVANCED_AI");
    if (blocked) return blocked;
  }

  const data: Record<string, unknown> = {};
  if (patch.enabled !== undefined) data.enabled = patch.enabled;
  if (patch.model !== undefined) data.model = patch.model;
  if (patch.tone !== undefined) data.tone = patch.tone;
  if (patch.maxTokens !== undefined) data.maxTokens = patch.maxTokens;
  if (patch.temperature !== undefined) data.temperature = patch.temperature;
  if (patch.fallbackToHuman !== undefined) data.fallbackToHuman = patch.fallbackToHuman;
  if (patch.driver !== undefined) data.runtimeDriver = patch.driver;
  if (patch.assistantName !== undefined) data.assistantName = patch.assistantName;
  if (patch.businessContext !== undefined) data.businessContext = patch.businessContext;
  if (patch.goal !== undefined) data.goal = patch.goal;
  if (patch.rules !== undefined) data.rules = patch.rules;
  if (patch.forbiddenTopics !== undefined) data.forbiddenTopics = patch.forbiddenTopics;
  if (patch.handoffTriggers !== undefined) data.handoffTriggers = patch.handoffTriggers;
  if (patch.autoReply !== undefined) data.autoReply = patch.autoReply;
  if (patch.outOfHoursReply !== undefined) data.outOfHoursReply = patch.outOfHoursReply;
  if (patch.playbookJson !== undefined) {
    data.playbookJson = patch.playbookJson === null ? null : patch.playbookJson;
  }

  data.configVersion = { increment: 1 };
  data.updatedByUserId = userId;

  const cfg = await prisma.aiAgentConfig.update({
    where: { tenantId },
    data: data as Parameters<typeof prisma.aiAgentConfig.update>[0]["data"],
  });

  await prisma.auditLog
    .create({
      data: {
        action: "ai_agent_config_updated",
        tenantId,
        userId,
        resourceType: "AiAgentConfig",
        resourceId: tenantId,
        metadata: { version: cfg.configVersion },
      },
    })
    .catch(() => {});

  return NextResponse.json({
    success: true,
    data: aiAgentConfigToApiResponse(cfg, tenant?.aiDriver ?? null),
  });
}

/** POST mantido para compatibilidade — delega para PUT */
export async function POST(request: NextRequest) {
  return PUT(request);
}
