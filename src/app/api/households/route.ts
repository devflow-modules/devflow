import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { householdCreateSchema } from "@/lib/financeiro/schema";
import {
  requireSessionOnly,
  getActiveHouseholdCookieName,
} from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { createMarketingEvent } from "@/lib/financeiro/marketing/service";

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireSessionOnly(request);
  if (!auth.ok) return auth.response;

  try {
    const payload = await request.json();
    const parseResult = householdCreateSchema.safeParse(payload);

    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }

    const { name, slug, timezone } = parseResult.data;

    const existing = await prisma.household.findUnique({
      where: { slug },
    });

    if (existing) {
      return sendError(
        "Já existe uma casa com este identificador (slug). Tente outro (ex.: casa-marques-2).",
        409,
        { slug },
        "SLUG_ALREADY_EXISTS"
      );
    }

    const existingMemberships = await prisma.householdMembership.count({
      where: { userId: auth.userId },
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
        userId: auth.userId,
        householdId: household.id,
        role: "OWNER",
      },
    });

    await createAuditLog(prisma, {
      userId: auth.userId,
      householdId: household.id,
      action: AUDIT_ACTIONS.HOUSEHOLD_CREATED,
      entityType: AUDIT_ENTITY.HOUSEHOLD,
      entityId: household.id,
      metadata: { slug: household.slug, name: household.name },
    });

    if (existingMemberships === 0) {
      const lead = await prisma.marketingLead.findUnique({
        where: { email: auth.email },
        select: { id: true },
      });
      await createMarketingEvent(prisma, {
        leadId: lead?.id ?? null,
        userId: auth.userId,
        event: "onboarding_completed",
      });
      await createMarketingEvent(prisma, {
        leadId: lead?.id ?? null,
        userId: auth.userId,
        event: "first_value",
        payload: { householdId: household.id },
      });
    }

    const response = sendSuccess(
      { id: household.id, name: household.name, slug: household.slug },
      201,
      "Casa criada"
    );
    response.cookies.set(getActiveHouseholdCookieName(), household.id, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar a casa", 500, error);
  }
}
