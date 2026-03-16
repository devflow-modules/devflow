import { trackLeadSubmission } from "@/analytics/growth";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { financeiroLeadCreateSchema } from "@/modules/financeiro/schemas";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { createLead } from "@/modules/financeiro/services/leads/createLead";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = financeiroLeadCreateSchema.safeParse(body);

    if (!parsed.success) {
      const msg =
        parsed.error.flatten().formErrors[0] ??
        Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
        "Dados inválidos";
      return sendError(typeof msg === "string" ? msg : "Dados inválidos", 400);
    }

    await createLead(prisma, {
      email: parsed.data.email,
      source: parsed.data.source,
    });

    trackLeadSubmission({
      sessionId: parsed.data.sessionId,
      source: parsed.data.source,
    });

    return sendSuccess({ message: "Cadastrado com sucesso" });
  } catch (err) {
    console.error("[financeiro/leads] POST error:", err);
    return sendError("Não foi possível salvar. Tente novamente.", 500);
  }
}
