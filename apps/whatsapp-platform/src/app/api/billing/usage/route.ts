import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getUsageDashboard } from "@/modules/billing/billingService";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  const period = request.nextUrl.searchParams.get("period");
  const parsedPeriod = period
    ? z.string().regex(/^\d{4}-\d{2}$/).safeParse(period)
    : null;
  if (period && !parsedPeriod?.success) {
    return NextResponse.json({ success: false, error: "period inválido (use YYYY-MM)" }, { status: 400 });
  }

  try {
    const data = await getUsageDashboard(
      auth.payload.tenantId,
      parsedPeriod?.success ? parsedPeriod.data : undefined
    );
    return NextResponse.json({
      success: true,
      data,
      examples: {
        estimatedFormula: "messagesSent × preço_mensagem + aiResponses × preço_IA (env)",
      },
    });
  } catch (e) {
    console.error("[billing/usage]", e);
    return NextResponse.json(
      { success: false, error: "Erro ao carregar uso" },
      { status: 500 }
    );
  }
}
