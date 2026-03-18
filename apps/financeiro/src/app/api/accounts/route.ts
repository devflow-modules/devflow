import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { accountCreateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { listAccounts, createAccount } from "@/modules/financeiro/services/accounts";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const accounts = await listAccounts(prisma, householdId);
    return sendSuccess(accounts);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível listar as contas", 500, error);
  }
}

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const payload = await request.json();
    const parsed = accountCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return sendError(parsed.error.message, 400, parsed.error.format());
    }
    const account = await createAccount(prisma, householdId, parsed.data);
    return sendSuccess(account, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar a conta", 500, error);
  }
}
