import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getAuthFromRequest } from "@/modules/auth";
import { getSubscriptionView } from "@/modules/billing/billingService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return jsonError("UNAUTHORIZED", "Não autorizado", 401);
  }

  try {
    const data = await getSubscriptionView(auth.payload.tenantId);
    return jsonSuccess({
      subscription: data,
      examples: {
        statusValues: ["active", "canceled", "past_due", "trialing", "free"],
      },
    });
  } catch (e) {
    console.error("[billing/subscription]", e);
    return jsonError("BILLING_SUBSCRIPTION_LOAD_FAILED", "Erro ao carregar assinatura", 500);
  }
}
