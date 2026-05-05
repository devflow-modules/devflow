import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { getUsageDashboard } from "@/modules/billing/billingService";
import {
  billingWriteForbiddenResponse,
  logBillingInternal,
  sanitizeUsageDashboard,
  shouldSanitizeBillingResponse,
} from "@/modules/billing/billingSanitizer";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }
  if (shouldSanitizeBillingResponse(auth.payload)) {
    return billingWriteForbiddenResponse();
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
    logBillingInternal("GET /api/billing/usage", auth.payload.tenantId, raw);
    const data = sanitizeUsageDashboard(raw, auth.payload);
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
