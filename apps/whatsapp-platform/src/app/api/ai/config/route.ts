import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { getOrCreateAiAgentConfig } from "@/modules/ai/aiAutomationService";
import { prisma } from "@/lib/prisma";

const MODELS = ["gpt-4o-mini", "gpt-4o"] as const;
const modelSchema = z.enum(MODELS);
const toneSchema = z.enum(["FRIENDLY", "SALES", "SUPPORT", "NEUTRAL"]);

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

const putSchema = z.object({
  enabled: z.boolean().optional(),
  systemPrompt: z.string().max(16_000).optional(),
  model: modelSchema.optional(),
  tone: toneSchema.optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
  fallbackToHuman: z.boolean().optional(),
});

export const dynamic = "force-dynamic";

async function getConfig(auth: { payload: { tenantId: string } }) {
  const cfg = await getOrCreateAiAgentConfig(auth.payload.tenantId);
  return {
    enabled: cfg.enabled,
    systemPrompt: cfg.systemPrompt,
    model: cfg.model ?? "gpt-4o-mini",
    tone: cfg.tone,
    maxTokens: cfg.maxTokens,
    temperature: cfg.temperature,
    fallbackToHuman: cfg.fallbackToHuman,
  };
}

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;
  const data = await getConfig(auth!);
  return NextResponse.json({ success: true, data });
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const tenantId = auth!.payload.tenantId;
  await getOrCreateAiAgentConfig(tenantId);

  const data: Record<string, unknown> = {};
  if (parsed.data.enabled !== undefined) data.enabled = parsed.data.enabled;
  if (parsed.data.systemPrompt !== undefined) data.systemPrompt = parsed.data.systemPrompt;
  if (parsed.data.model !== undefined) data.model = parsed.data.model;
  if (parsed.data.tone !== undefined) data.tone = parsed.data.tone;
  if (parsed.data.fallbackToHuman !== undefined) data.fallbackToHuman = parsed.data.fallbackToHuman;
  if (parsed.data.maxTokens !== undefined) data.maxTokens = clamp(parsed.data.maxTokens, 50, 500);
  if (parsed.data.temperature !== undefined)
    data.temperature = clamp(parsed.data.temperature, 0, 1);

  const cfg = await prisma.aiAgentConfig.update({
    where: { tenantId },
    data,
  });

  return NextResponse.json({
    success: true,
    data: {
      enabled: cfg.enabled,
      systemPrompt: cfg.systemPrompt,
      model: cfg.model ?? "gpt-4o-mini",
      tone: cfg.tone,
      maxTokens: cfg.maxTokens,
      temperature: cfg.temperature,
      fallbackToHuman: cfg.fallbackToHuman,
    },
  });
}

/** POST mantido para compatibilidade — delega para PUT */
export async function POST(request: NextRequest) {
  return PUT(request);
}
