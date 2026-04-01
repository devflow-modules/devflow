import type { Prisma, PrismaClient } from "@prisma/client";

export async function createMarketingEvent(
  prisma: PrismaClient,
  input: {
    leadId?: string | null;
    userId?: string | null;
    event: string;
    payload?: Record<string, unknown>;
  }
) {
  await prisma.marketingEvent.create({
    data: {
      leadId: input.leadId ?? null,
      userId: input.userId ?? null,
      event: input.event,
      payload: input.payload as Prisma.InputJsonValue | undefined,
    },
  });
}
