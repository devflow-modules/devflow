import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError } from "@/modules/financeiro/lib/api-response";
import { buildSuccessPayload } from "@/modules/financeiro/lib/utils/response";
import type { Prisma } from "@prisma/client";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { guardFinancialMutation, logFinanceEvent } from "@/app/api/_helpers/financialMutation";
import { closeAccountMonth } from "@/modules/financeiro/services/accounts";
import { closeAccountMonthSchema } from "@/modules/financeiro/schemas";

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
  const parsed = closeAccountMonthSchema.safeParse(body);
  if (!parsed.success) {
    return sendError(parsed.error.errors[0]?.message ?? "Mês inválido (use YYYY-MM)", 400);
  }
  const { month, idempotencyKey } = parsed.data;
  const key = idempotencyKey?.trim();

  try {
    if (key && key.length >= 8) {
      const existing = await prisma.idempotencyRecord.findUnique({
        where: { householdId_key: { householdId, key } },
      });
      if (existing) {
        return NextResponse.json(existing.response, { status: existing.statusCode });
      }
    }

    const r = await closeAccountMonth(prisma, accountId, householdId, month);
    if (!r.ok) {
      if (r.code === "NOT_FOUND") return sendError("Conta não encontrada", 404);
      return sendError("Mês inválido", 400);
    }

    const payload = buildSuccessPayload({ month: r.month, balances: r.balances });
    logFinanceEvent({
      action: "month_closed",
      userId,
      householdId,
      accountId,
      month: r.month,
    });
    if (key && key.length >= 8) {
      try {
        await prisma.idempotencyRecord.create({
          data: {
            householdId,
            key,
            response: payload as Prisma.InputJsonValue,
            statusCode: 200,
          },
        });
      } catch {
        const again = await prisma.idempotencyRecord.findUnique({
          where: { householdId_key: { householdId, key } },
        });
        if (again) return NextResponse.json(again.response, { status: again.statusCode });
      }
    }
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível fechar o mês", 500, error);
  }
}
