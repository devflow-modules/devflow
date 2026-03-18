import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError } from "@/modules/financeiro/lib/api-response";
import { buildSuccessPayload } from "@/modules/financeiro/lib/utils/response";
import type { Prisma } from "@prisma/client";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { guardFinancialMutation, logFinanceEvent } from "@/app/api/_helpers/financialMutation";
import { reversePayment } from "@/modules/financeiro/services/accounts";
import { paymentReverseSchema } from "@/modules/financeiro/schemas";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const rl = guardFinancialMutation(auth.context.userId);
  if (rl) return rl;
  const { householdId, userId } = auth.context;
  const { id: paymentId } = await params;

  const body = await request.json().catch(() => ({}));
  const parsed = paymentReverseSchema.safeParse(body);
  if (!parsed.success) {
    return sendError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }
  const { idempotencyKey, amount } = parsed.data;
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

    const r = await reversePayment(prisma, paymentId, householdId, amount);
    if (!r.ok) {
      const msg =
        r.code === "NOT_FOUND"
          ? "Pagamento não encontrado"
          : r.code === "NOTHING_TO_REVERSE"
            ? "Nada a estornar neste pagamento"
            : r.code === "EXCEEDS_REFUNDABLE"
              ? "Valor de estorno maior que o disponível"
              : "Valor inválido";
      return sendError(msg, r.code === "NOT_FOUND" ? 404 : 400, undefined, r.code);
    }

    const payload = buildSuccessPayload({
      reversalId: r.reversalId,
      reversedAmount: r.reversedAmount,
      settlementId: r.settlementId,
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
    const st = await prisma.settlement.findFirst({
      where: { id: r.settlementId, account: { householdId } },
      select: { accountId: true },
    });
    logFinanceEvent({
      action: "payment_reversed",
      userId,
      householdId,
      paymentId,
      settlementId: r.settlementId,
      accountId: st?.accountId,
      amount: r.reversedAmount,
    });
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível estornar", 500, error);
  }
}
