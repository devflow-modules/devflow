import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";

const AI_DRIVERS = ["ruleBased", "openAI", "claude"] as const;

const patchBodySchema = z.object({
  name: z.string().min(1).optional(),
  defaultPrompt: z.string().optional(),
  systemPrompt: z.string().optional(),
  whatsappPhone: z.string().optional(),
  phoneNumberId: z.string().optional(),
  displayPhoneNumber: z.string().optional(),
  accessToken: z.string().optional(),
  aiDriver: z.enum(AI_DRIVERS).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.payload.tenantId },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });
  }

  const apiKeyMasked = tenant.apiKey
    ? `${tenant.apiKey.slice(0, 8)}...${tenant.apiKey.slice(-4)}`
    : null;

  return NextResponse.json({
    id: tenant.id,
    name: tenant.name,
    plan: tenant.plan,
    activeUntil: tenant.activeUntil?.toISOString() ?? null,
    defaultPrompt: tenant.defaultPrompt,
    systemPrompt: tenant.systemPrompt,
    whatsappPhone: tenant.whatsappPhone,
    displayPhoneNumber: tenant.displayPhoneNumber,
    apiKey: apiKeyMasked,
    hasApiKey: Boolean(tenant.apiKey),
    phoneNumberId: tenant.phoneNumberId,
    aiDriver: tenant.aiDriver ?? null,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const parsed = patchBodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const updateData = { ...parsed.data };
  if (updateData.aiDriver === null) updateData.aiDriver = null;

  const tenant = await prisma.tenant.update({
    where: { id: auth.payload.tenantId },
    data: updateData,
  });

  return NextResponse.json({
    id: tenant.id,
    name: tenant.name,
    defaultPrompt: tenant.defaultPrompt,
    systemPrompt: tenant.systemPrompt,
    hasApiKey: Boolean(tenant.apiKey),
    aiDriver: tenant.aiDriver ?? null,
  });
}
