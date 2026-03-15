import { NextResponse } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { financeiroLeadCreateSchema } from "@/lib/financeiro/schema";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";

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

    const { email, source } = parsed.data;

    await prisma.financeiroLead.create({
      data: { email: email.trim().toLowerCase(), source },
    });

    return sendSuccess({ message: "Cadastrado com sucesso" });
  } catch (err) {
    console.error("[financeiro/leads] POST error:", err);
    return sendError("Não foi possível salvar. Tente novamente.", 500);
  }
}
