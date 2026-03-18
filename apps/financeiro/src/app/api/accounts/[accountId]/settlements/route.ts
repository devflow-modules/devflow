import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { buildSuccessPayload } from "@/modules/financeiro/lib/utils/response";
import type { Prisma } from "@prisma/client";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { guardFinancialMutation, logFinanceEvent } from "@/app/api/_helpers/financialMutation";
import { listSettlements, createSettlementsFromBalances } from "@/modules/financeiro/services/accounts";
import { settlementsGenerateSchema } from "@/modules/financeiro/schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;
  const { accountId } = await params;

  try {
    const list = await listSettlements(prisma, accountId, householdId);
    return sendSuccess(list);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível listar as liquidações", 500, error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const rl = guardFinancialMutation(auth.context.userId);
  if (rl) return rl;
  const { householdId, userId } = auth.context;
  const { accountId } = await params;

  const body = await request.json().catch(() => ({}));
  const parsed = settlementsGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return sendError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }
  const key = parsed.data.idempotencyKey?.trim();

  try {
    if (key && key.length >= 8) {
      const existing = await prisma.idempotencyRecord.findUnique({
        where: { householdId_key: { householdId, key } },
      });
      if (existing) {
        return NextResponse.json(existing.response, { status: existing.statusCode });
      }
    }

    const list = await createSettlementsFromBalances(prisma, accountId, householdId);
    const payload = buildSuccessPayload(list);
    logFinanceEvent({
      action: "settlements_generated",
      userId,
      householdId,
      accountId,
      meta: { pendingCount: list.filter((s) => s.status === "PENDING").length },
    });
    if (key && key.length >= 8) {
      try {
        await prisma.idempotencyRecord.create({
          data: {
            householdId,
            key,
            response: payload as Prisma.InputJsonValue,
            statusCode: 201,
          },
        });
      } catch {
        const again = await prisma.idempotencyRecord.findUnique({
          where: { householdId_key: { householdId, key } },
        });
        if (again) return NextResponse.json(again.response, { status: again.statusCode });
      }
    }
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível gerar as liquidações", 500, error);
  }
}
