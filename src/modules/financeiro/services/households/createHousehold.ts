import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { createMarketingEvent } from "@/modules/financeiro/lib/marketing/service";
import { trackHouseholdCreated } from "@/analytics/growth";
import { trackFunnelFirst } from "@/modules/financeiro/adapters/productAnalytics";

export type CreateHouseholdInput = {
  name: string;
  slug: string;
  timezone?: string;
};

export type CreateHouseholdContext = {
  userId: string;
  email: string;
};

export type CreateHouseholdResult =
  | { ok: true; household: { id: string; name: string; slug: string }; isFirstHousehold: boolean }
  | { ok: false; code: "SLUG_ALREADY_EXISTS"; slug: string };

export async function createHousehold(
  prisma: PrismaClient,
  data: CreateHouseholdInput,
  context: CreateHouseholdContext
): Promise<CreateHouseholdResult> {
  const { name, slug, timezone } = data;

  const existing = await prisma.household.findUnique({ where: { slug } });
  if (existing) return { ok: false, code: "SLUG_ALREADY_EXISTS", slug };

  const existingMemberships = await prisma.householdMembership.count({
    where: { userId: context.userId },
  });

  const household = await prisma.household.create({
    data: {
      name,
      slug,
      timezone: timezone ?? "America/Sao_Paulo",
    },
  });

  await prisma.householdMembership.create({
    data: {
      userId: context.userId,
      householdId: household.id,
      role: "OWNER",
    },
  });

  await createAuditLog(prisma, {
    userId: context.userId,
    householdId: household.id,
    action: AUDIT_ACTIONS.HOUSEHOLD_CREATED,
    entityType: AUDIT_ENTITY.HOUSEHOLD,
    entityId: household.id,
    metadata: { slug: household.slug, name: household.name },
  });

  trackFunnelFirst("finance.funnel.household.created", {
    userId: context.userId,
    householdId: household.id,
  });
  trackHouseholdCreated({ userId: context.userId, householdId: household.id });

  const isFirstHousehold = existingMemberships === 0;
  if (isFirstHousehold) {
    const lead = await prisma.marketingLead.findUnique({
      where: { email: context.email },
      select: { id: true },
    });
    await createMarketingEvent(prisma, {
      leadId: lead?.id ?? null,
      userId: context.userId,
      event: "onboarding_completed",
    });
    await createMarketingEvent(prisma, {
      leadId: lead?.id ?? null,
      userId: context.userId,
      event: "first_value",
      payload: { householdId: household.id },
    });
  }

  return {
    ok: true,
    household: { id: household.id, name: household.name, slug: household.slug },
    isFirstHousehold,
  };
}
