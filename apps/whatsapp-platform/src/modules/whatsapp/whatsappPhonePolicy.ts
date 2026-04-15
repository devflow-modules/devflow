/**
 * Garante que o tenant tem exactamente uma linha primária e uma default outbound (índices únicos parciais).
 */

import { prisma } from "@/lib/prisma";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";

const LINE_STATUSES_FOR_UI: WhatsappPhoneNumberStatus[] = [
  WhatsappPhoneNumberStatus.ACTIVE,
  WhatsappPhoneNumberStatus.PENDING_ACTIVATION,
];

export async function ensureTenantHasPrimaryAndDefaultOutbound(tenantId: string): Promise<void> {
  const firstLine =
    (await prisma.whatsappPhoneNumber.findFirst({
      where: { tenantId, status: WhatsappPhoneNumberStatus.ACTIVE },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.whatsappPhoneNumber.findFirst({
      where: { tenantId, status: WhatsappPhoneNumberStatus.PENDING_ACTIVATION },
      orderBy: { createdAt: "asc" },
    }));
  if (!firstLine) return;

  let primary = await prisma.whatsappPhoneNumber.findFirst({
    where: { tenantId, isPrimary: true, status: { in: LINE_STATUSES_FOR_UI } },
  });
  if (!primary) {
    await prisma.$transaction([
      prisma.whatsappPhoneNumber.updateMany({
        where: { tenantId, isPrimary: true },
        data: { isPrimary: false },
      }),
      prisma.whatsappPhoneNumber.update({
        where: { id: firstLine.id },
        data: { isPrimary: true },
      }),
    ]);
    primary = await prisma.whatsappPhoneNumber.findFirst({
      where: { tenantId, isPrimary: true, status: { in: LINE_STATUSES_FOR_UI } },
    });
  }

  const def = await prisma.whatsappPhoneNumber.findFirst({
    where: { tenantId, isDefaultOutbound: true, status: { in: LINE_STATUSES_FOR_UI } },
  });
  if (!def) {
    const targetId = primary?.id ?? firstLine.id;
    await prisma.$transaction([
      prisma.whatsappPhoneNumber.updateMany({
        where: { tenantId, isDefaultOutbound: true },
        data: { isDefaultOutbound: false },
      }),
      prisma.whatsappPhoneNumber.update({
        where: { id: targetId },
        data: { isDefaultOutbound: true },
      }),
    ]);
  }
}

export async function setWhatsappLineAsPrimary(tenantId: string, whatsappPhoneNumberRowId: string) {
  await prisma.$transaction([
    prisma.whatsappPhoneNumber.updateMany({
      where: { tenantId, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.whatsappPhoneNumber.update({
      where: { id: whatsappPhoneNumberRowId, tenantId },
      data: { isPrimary: true },
    }),
  ]);
}

export async function setWhatsappLineAsDefaultOutbound(tenantId: string, whatsappPhoneNumberRowId: string) {
  await prisma.$transaction([
    prisma.whatsappPhoneNumber.updateMany({
      where: { tenantId, isDefaultOutbound: true },
      data: { isDefaultOutbound: false },
    }),
    prisma.whatsappPhoneNumber.update({
      where: { id: whatsappPhoneNumberRowId, tenantId },
      data: { isDefaultOutbound: true },
    }),
  ]);
}
