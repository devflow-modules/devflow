import { NextRequest } from "next/server";
import { BillingService } from "@/modules/billing";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { ruleCreateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { listRules } from "@/modules/financeiro/services/rules/listRules";
import { createRule } from "@/modules/financeiro/services/rules/createRule";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const rules = await listRules(prisma, householdId);
    return sendSuccess(rules);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível listar as regras", 500, error);
  }
}

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId, userId } = auth.context;

  try {
    const payload = await request.json();
    const parseResult = ruleCreateSchema.safeParse(payload);
    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }
    // BILLING_SOFT_CHECK: limite de regras por plano (removível)
    const existingRules = await listRules(prisma, householdId);
    if (!(await BillingService.checkLimit(userId, "rules", existingRules.length))) {
      return sendError(
        "Limite de regras do seu plano atingido. Faça upgrade para criar mais.",
        402,
        { code: "RULE_LIMIT_REACHED" },
        "RULE_LIMIT_REACHED"
      );
    }
    const rule = await createRule(prisma, householdId, parseResult.data, { userId, householdId });
    return sendSuccess(rule, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar a regra", 500, error);
  }
}
