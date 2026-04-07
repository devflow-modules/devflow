/**
 * Garante que o tenant tem exactamente uma linha primária e uma default outbound (índices únicos parciais).
 */

import { prisma } from "@/lib/prisma";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";

export async function ensureTenantHasPrimaryAndDefaultOutbound(tenantId: string): Promise<void> {
  const firstActive = await prisma.whatsappPhoneNumber.findFirst({
    where: { tenantId, status: WhatsappPhoneNumberStatus.ACTIVE },
    orderBy: { createdAt: "asc" },
  });
  if (!firstActive) return;

  let primary = await prisma.whatsappPhoneNumber.findFirst({
    where: { tenantId, isPrimary: true, status: WhatsappPhoneNumberStatus.ACTIVE },
  });
  if (!primary) {
    await prisma.$transaction([
      prisma.whatsappPhoneNumber.updateMany({
        where: { tenantId, isPrimary: true },
        data: { isPrimary: false },
      }),
      prisma.whatsappPhoneNumber.update({
        where: { id: firstActive.id },
        data: { isPrimary: true },
      }),
    ]);
    primary = await prisma.whatsappPhoneNumber.findFirst({
      where: { tenantId, isPrimary: true, status: WhatsappPhoneNumberStatus.ACTIVE },
    });
  }

  const def = await prisma.whatsappPhoneNumber.findFirst({
    where: { tenantId, isDefaultOutbound: true, status: WhatsappPhoneNumberStatus.ACTIVE },
  });
  if (!def) {
    const targetId = primary?.id ?? firstActive.id;
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
      data: { isPrimary: true, status: WhatsappPhoneNumberStatus.ACTIVE },
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
      data: { isDefaultOutbound: true, status: WhatsappPhoneNumberStatus.ACTIVE },
    }),
  ]);
}
