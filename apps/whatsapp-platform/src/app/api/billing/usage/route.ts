import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getUsageDashboard } from "@/modules/billing/billingService";
import {
  logBillingInternal,
  sanitizeUsageDashboard,
  shouldSanitizeBillingResponse,
} from "@/modules/billing/billingSanitizer";
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
    const raw = await getUsageDashboard(
      auth.payload.tenantId,
      parsedPeriod?.success ? parsedPeriod.data : undefined
    );
    if (shouldSanitizeBillingResponse(auth.payload)) {
      logBillingInternal("GET /api/billing/usage", auth.payload.tenantId, raw);
    }
    const data = sanitizeUsageDashboard(raw, auth.payload);
    return NextResponse.json({
      success: true,
      data,
      ...(shouldSanitizeBillingResponse(auth.payload)
        ? {}
        : {
            examples: {
              estimatedFormula: "messagesSent × preço_mensagem + aiResponses × preço_IA (env)",
            },
          }),
    });
  } catch (e) {
    console.error("[billing/usage]", e);
    return NextResponse.json(
      { success: false, error: "Erro ao carregar uso" },
      { status: 500 }
    );
  }
}
