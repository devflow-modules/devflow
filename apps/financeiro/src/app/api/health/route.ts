import { sendSuccess } from "@/modules/financeiro/lib/api-response";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";

export async function GET() {
  try {
    await prisma.expense.findFirst({
      select: { id: true, paidAt: true, isRecurring: true },
    });
  } catch (error) {
    console.warn(
      "[health] Possível migration pendente. Rode db:migrate:deploy antes do deploy.",
      error
    );
  }

  return sendSuccess({ status: "ok", timestamp: new Date().toISOString() });
}
