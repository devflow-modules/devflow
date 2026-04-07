import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma-whatsapp";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";
import { resolvePrimaryPhoneNumber } from "@/modules/whatsapp/whatsappPhoneResolution";
import { ensureTenantHasPrimaryAndDefaultOutbound } from "@/modules/whatsapp/whatsappPhonePolicy";

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

  const primaryWpn = await resolvePrimaryPhoneNumber(tenant.id);

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
    apiKey: apiKeyMasked,
    hasApiKey: Boolean(tenant.apiKey),
    aiDriver: tenant.aiDriver ?? null,
    hasWhatsappPhone: Boolean(primaryWpn),
    primaryPhoneNumberId: primaryWpn?.phoneNumberId ?? null,
    primaryDisplayPhoneNumber: primaryWpn?.displayPhoneNumber ?? null,
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

  const data = parsed.data;
  const wantsPhone =
    data.phoneNumberId !== undefined ||
    data.accessToken !== undefined ||
    data.displayPhoneNumber !== undefined;

  if (wantsPhone) {
    const phoneNumberId = data.phoneNumberId?.trim();
    const accessToken = data.accessToken?.trim();
    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: "Para ligar WhatsApp manualmente, envie phoneNumberId e accessToken." },
        { status: 400 }
      );
    }

    const existingGlobal = await prisma.whatsappPhoneNumber.findUnique({
      where: { phoneNumberId },
    });
    if (existingGlobal && existingGlobal.tenantId !== auth.payload.tenantId) {
      return NextResponse.json(
        { error: "Este Phone Number ID já está associado a outra conta." },
        { status: 409 }
      );
    }

    await prisma.whatsappPhoneNumber.upsert({
      where: { phoneNumberId },
      create: {
        tenantId: auth.payload.tenantId,
        phoneNumberId,
        displayPhoneNumber: data.displayPhoneNumber?.trim() || null,
        accessToken,
        status: WhatsappPhoneNumberStatus.ACTIVE,
      },
      update: {
        tenantId: auth.payload.tenantId,
        displayPhoneNumber:
          data.displayPhoneNumber !== undefined ? data.displayPhoneNumber.trim() || null : undefined,
        accessToken,
        status: WhatsappPhoneNumberStatus.ACTIVE,
      },
    });
    await ensureTenantHasPrimaryAndDefaultOutbound(auth.payload.tenantId);
  }

  const tenantPatch: Prisma.TenantUpdateInput = {};
  if (data.name !== undefined) tenantPatch.name = data.name;
  if (data.defaultPrompt !== undefined) tenantPatch.defaultPrompt = data.defaultPrompt;
  if (data.systemPrompt !== undefined) tenantPatch.systemPrompt = data.systemPrompt;
  if (data.whatsappPhone !== undefined) tenantPatch.whatsappPhone = data.whatsappPhone;
  if (data.aiDriver !== undefined) tenantPatch.aiDriver = data.aiDriver;

  if (Object.keys(tenantPatch).length > 0) {
    await prisma.tenant.update({
      where: { id: auth.payload.tenantId },
      data: tenantPatch,
    });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.payload.tenantId },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: tenant.id,
    name: tenant.name,
    defaultPrompt: tenant.defaultPrompt,
    systemPrompt: tenant.systemPrompt,
    hasApiKey: Boolean(tenant.apiKey),
    aiDriver: tenant.aiDriver ?? null,
  });
}
