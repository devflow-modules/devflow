import type { Prisma } from "@/generated/prisma-whatsapp";
import { EmailDeliveryStatus } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";

export async function createSentEmailMessage(input: {
  tenantId?: string | null;
  userId?: string | null;
  type: string;
  toEmail: string;
  subject: string;
  provider: string;
  providerMessageId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.emailMessage.create({
    data: {
      tenantId: input.tenantId ?? undefined,
      userId: input.userId ?? undefined,
      type: input.type,
      toEmail: input.toEmail,
      subject: input.subject,
      provider: input.provider,
      providerMessageId: input.providerMessageId,
      status: EmailDeliveryStatus.SENT,
      metadata: input.metadata ?? undefined,
    },
  });
}

export async function createFailedEmailMessage(input: {
  tenantId?: string | null;
  userId?: string | null;
  type: string;
  toEmail: string;
  subject: string;
  provider: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.emailMessage.create({
    data: {
      tenantId: input.tenantId ?? undefined,
      userId: input.userId ?? undefined,
      type: input.type,
      toEmail: input.toEmail,
      subject: input.subject,
      provider: input.provider,
      status: EmailDeliveryStatus.FAILED,
      errorCode: input.errorCode ?? undefined,
      errorMessage: input.errorMessage?.slice(0, 2000) ?? undefined,
      metadata: input.metadata ?? undefined,
    },
  });
}
