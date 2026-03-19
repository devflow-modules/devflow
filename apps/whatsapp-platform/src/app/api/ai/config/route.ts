import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/modules/auth";
import { getOrCreateAiAgentConfig } from "@/modules/ai/aiAutomationService";
import { prisma } from "@/lib/prisma";
const toneSchema = z.enum(["FRIENDLY", "SALES", "SUPPORT", "NEUTRAL"]);

const postSchema = z.object({
  enabled: z.boolean().optional(),
  systemPrompt: z.string().max(16_000).optional(),
  tone: toneSchema.optional(),
  maxTokens: z.number().int().min(64).max(4096).optional(),
  temperature: z.number().min(0).max(2).optional(),
  fallbackToHuman: z.boolean().optional(),
});

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  const cfg = await getOrCreateAiAgentConfig(auth.payload.tenantId);
  return NextResponse.json({
    success: true,
    data: {
      enabled: cfg.enabled,
      systemPrompt: cfg.systemPrompt,
      tone: cfg.tone,
      maxTokens: cfg.maxTokens,
      temperature: cfg.temperature,
      fallbackToHuman: cfg.fallbackToHuman,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const tenantId = auth.payload.tenantId;
  await getOrCreateAiAgentConfig(tenantId);

  const cfg = await prisma.aiAgentConfig.update({
    where: { tenantId },
    data: {
      ...(parsed.data.enabled !== undefined && { enabled: parsed.data.enabled }),
      ...(parsed.data.systemPrompt !== undefined && { systemPrompt: parsed.data.systemPrompt }),
      ...(parsed.data.tone !== undefined && { tone: parsed.data.tone }),
      ...(parsed.data.maxTokens !== undefined && { maxTokens: parsed.data.maxTokens }),
      ...(parsed.data.temperature !== undefined && { temperature: parsed.data.temperature }),
      ...(parsed.data.fallbackToHuman !== undefined && {
        fallbackToHuman: parsed.data.fallbackToHuman,
      }),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      enabled: cfg.enabled,
      systemPrompt: cfg.systemPrompt,
      tone: cfg.tone,
      maxTokens: cfg.maxTokens,
      temperature: cfg.temperature,
      fallbackToHuman: cfg.fallbackToHuman,
    },
  });
}
