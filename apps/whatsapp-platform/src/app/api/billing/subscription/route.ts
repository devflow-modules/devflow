import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { getSubscriptionView } from "@/modules/billing/billingService";
import {
  billingWriteForbiddenResponse,
  logBillingInternal,
  sanitizeSubscriptionView,
  shouldSanitizeBillingResponse,
} from "@/modules/billing/billingSanitizer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;
  if (!auth) {
    return jsonError("UNAUTHORIZED", "Não autorizado", 401);
  }
  if (shouldSanitizeBillingResponse(auth.payload)) {
    return billingWriteForbiddenResponse();
  }

  try {
    const raw = await getSubscriptionView(auth.payload.tenantId);
    logBillingInternal("GET /api/billing/subscription", auth.payload.tenantId, raw);
    const subscription = sanitizeSubscriptionView(raw, auth.payload);
    return jsonSuccess({
      subscription,
      examples: {
        statusValues: ["active", "canceled", "past_due", "trialing", "free"],
      },
    });
  } catch (e) {
    console.error("[billing/subscription]", e);
    return jsonError("BILLING_SUBSCRIPTION_LOAD_FAILED", "Erro ao carregar assinatura", 500);
  }
}
