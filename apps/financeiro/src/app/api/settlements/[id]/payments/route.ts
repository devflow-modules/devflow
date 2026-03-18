import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { buildSuccessPayload } from "@/modules/financeiro/lib/utils/response";
import type { Prisma } from "@prisma/client";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { guardFinancialMutation, logFinanceEvent } from "@/app/api/_helpers/financialMutation";
import { applyPayment } from "@/modules/financeiro/services/accounts";
import { settlementPaymentSchema } from "@/modules/financeiro/schemas";

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
  const { id: settlementId } = await params;

  const body = await request.json().catch(() => ({}));
  const parsed = settlementPaymentSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Dados inválidos";
    return sendError(msg, 400);
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

    const r = await applyPayment(prisma, settlementId, amount, householdId);
    if (!r.ok) {
      if (r.code === "EXCEEDS_REMAINING") {
        return sendError("Valor maior que o restante da dívida", 400, undefined, "EXCEEDS_REMAINING");
      }
      if (r.code === "INVALID_AMOUNT") return sendError("Valor inválido", 400);
      return sendError("Liquidação não encontrada", 404);
    }

    const payload = buildSuccessPayload(r.settlement);
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
    logFinanceEvent({
      action: "payment_applied",
      userId,
      householdId,
      settlementId,
      amount,
    });
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível registrar o pagamento", 500, error);
  }
}
