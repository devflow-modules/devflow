import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";
import { logChannelEvent } from "@/modules/whatsapp/channelEventService";
import { validateWhatsappCloudCredentials } from "@/modules/whatsapp/validateWhatsappCloudCredentials";
import { ensureTenantHasPrimaryAndDefaultOutbound } from "@/modules/whatsapp/whatsappPhonePolicy";

const manualCreateSchema = z.object({
  tenantId: z.string().min(1),
  phone: z.string().min(8).max(32),
  wabaId: z.string().min(1),
  phoneNumberId: z.string().min(1),
});

export type CreateWhatsappChannelManualInput = z.infer<typeof manualCreateSchema>;

/**
 * Provisão manual (admin): número visível no dashboard; envio após `activateWhatsappChannel`.
 */
export async function createWhatsappChannelManual(
  input: CreateWhatsappChannelManualInput
) {
  const data = manualCreateSchema.parse(input);
  const existing = await prisma.whatsappPhoneNumber.findUnique({
    where: { phoneNumberId: data.phoneNumberId.trim() },
  });
  if (existing && existing.tenantId !== data.tenantId) {
    throw new Error("PHONE_NUMBER_ID_IN_USE");
  }
  if (
    existing &&
    existing.tenantId === data.tenantId &&
    existing.status === WhatsappPhoneNumberStatus.ACTIVE &&
    existing.accessToken?.trim()
  ) {
    return existing;
  }

  const row = await prisma.whatsappPhoneNumber.upsert({
    where: { phoneNumberId: data.phoneNumberId.trim() },
    create: {
      tenantId: data.tenantId,
      phoneNumberId: data.phoneNumberId.trim(),
      displayPhoneNumber: data.phone.trim(),
      wabaId: data.wabaId.trim(),
      accessToken: null,
      status: WhatsappPhoneNumberStatus.PENDING_ACTIVATION,
      isPrimary: true,
      isDefaultOutbound: true,
    },
    update: {
      tenantId: data.tenantId,
      displayPhoneNumber: data.phone.trim(),
      wabaId: data.wabaId.trim(),
      status: WhatsappPhoneNumberStatus.PENDING_ACTIVATION,
    },
  });

  await prisma.whatsappPhoneNumber.updateMany({
    where: { tenantId: data.tenantId, id: { not: row.id } },
    data: { isPrimary: false, isDefaultOutbound: false },
  });
  await ensureTenantHasPrimaryAndDefaultOutbound(data.tenantId);

  await logChannelEvent({
    channelId: row.id,
    type: "CHANNEL_CREATED",
    message: existing
      ? "Canal atualizado para pendente (provisionamento manual)."
      : "Canal criado (provisionamento manual).",
    metadata: { tenantId: data.tenantId, phoneNumberId: row.phoneNumberId },
  });

  return row;
}

const activateSchema = z.object({
  channelId: z.string().min(1),
  accessToken: z.string().min(10),
});

export type ActivateWhatsappChannelInput = z.infer<typeof activateSchema>;

/**
 * Valida token na Cloud API e ativa o canal.
 */
export async function activateWhatsappChannel(
  input: ActivateWhatsappChannelInput,
  options?: { expectedTenantId?: string }
) {
  const data = activateSchema.parse(input);
  const row = await prisma.whatsappPhoneNumber.findUnique({
    where: { id: data.channelId.trim() },
  });
  if (!row) {
    throw new Error("CHANNEL_NOT_FOUND");
  }
  if (options?.expectedTenantId && row.tenantId !== options.expectedTenantId) {
    throw new Error("CHANNEL_TENANT_MISMATCH");
  }

  const token = data.accessToken.trim();
  const validation = await validateWhatsappCloudCredentials(row.phoneNumberId, token);
  if (!validation.ok) {
    const err = new Error(validation.message);
    (err as Error & { code?: string }).code = validation.code;
    throw err;
  }

  await logChannelEvent({
    channelId: row.id,
    type: "TOKEN_ATTACHED",
    message: "Token validado na Cloud API (credenciais OK).",
    metadata: { phoneNumberId: row.phoneNumberId },
  });

  const display =
    validation.displayPhoneNumber?.trim() || row.displayPhoneNumber?.trim() || null;

  const updated = await prisma.whatsappPhoneNumber.update({
    where: { id: row.id },
    data: {
      accessToken: token,
      status: WhatsappPhoneNumberStatus.ACTIVE,
      displayPhoneNumber: display ?? row.displayPhoneNumber,
      ...(row.activatedAt == null ? { activatedAt: new Date() } : {}),
    },
  });
  await ensureTenantHasPrimaryAndDefaultOutbound(row.tenantId);

  await logChannelEvent({
    channelId: updated.id,
    type: "ACTIVATED",
    message: "Canal ativo e pronto para envio (quando aplicável).",
    metadata: { status: updated.status, activatedAt: updated.activatedAt?.toISOString() ?? null },
  });

  return updated;
}
