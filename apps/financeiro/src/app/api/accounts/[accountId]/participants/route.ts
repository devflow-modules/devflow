import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { accountParticipantSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { addParticipant } from "@/modules/financeiro/services/accounts";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;
  const { accountId } = await params;

  try {
    const payload = await request.json();
    const parsed = accountParticipantSchema.safeParse(payload);
    if (!parsed.success) {
      return sendError(parsed.error.message, 400, parsed.error.format());
    }
    const participant = await addParticipant(
      prisma,
      accountId,
      householdId,
      parsed.data
    );
    if (!participant) return sendError("Conta não encontrada", 404);
    return sendSuccess(participant, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível adicionar participante", 500, error);
  }
}
