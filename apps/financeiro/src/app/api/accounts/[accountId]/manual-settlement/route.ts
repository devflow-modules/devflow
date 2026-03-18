import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError } from "@/modules/financeiro/lib/api-response";
import { buildSuccessPayload } from "@/modules/financeiro/lib/utils/response";
import type { Prisma } from "@prisma/client";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { guardFinancialMutation, logFinanceEvent } from "@/app/api/_helpers/financialMutation";
import { createManualSettlement } from "@/modules/financeiro/services/accounts";
import { manualSettlementSchema } from "@/modules/financeiro/schemas";

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
  const parsed = manualSettlementSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Dados inválidos";
    return sendError(msg, 400);
  }

  const { idempotencyKey, ...data } = parsed.data;
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

    const settlement = await createManualSettlement(prisma, accountId, householdId, data);
    if (!settlement) {
      return sendError(
        "Conta não encontrada, par inválido ou já existe liquidação em aberto para este par",
        404,
        undefined,
        "MANUAL_SETTLEMENT_BLOCKED"
      );
    }

    const payload = buildSuccessPayload(settlement);
    logFinanceEvent({
      action: "settlement_created",
      userId,
      householdId,
      accountId,
      settlementId: settlement.id,
      amount: Number(settlement.amount),
      meta: { manual: true },
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
    return sendError("Não foi possível registrar o pagamento manual", 500, error);
  }
}
