import { NextRequest } from "next/server";
import { requireSessionOnly } from "@/app/api/_helpers/auth";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { openCustomerPortal } from "@/modules/billing/BillingPortalService";
import {
  trackCustomerPortalOpened,
  trackSubscriptionManageClicked,
} from "@/modules/billing/billingAnalytics";

export async function POST(request: NextRequest) {
  const auth = await requireSessionOnly(request);
  if (!auth.ok) return auth.response;

  trackSubscriptionManageClicked({ userId: auth.userId });

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin ?? "http://localhost:3000";
  const returnUrl = `${baseUrl}/billing`;

  const result = await openCustomerPortal(auth.userId, returnUrl);

  if (!result.ok) {
    if (result.error === "BILLING_PROFILE_NOT_FOUND" || result.error === "STRIPE_CUSTOMER_NOT_FOUND") {
      return sendError(
        "Perfil de cobrança não encontrado. Faça o checkout primeiro.",
        404,
        undefined,
        result.error
      );
    }
    return sendError("Erro interno ao abrir portal de assinatura", 500, undefined, "INTERNAL_ERROR");
  }

  trackCustomerPortalOpened({ userId: auth.userId });

  return sendSuccess({ portalUrl: result.portalUrl });
}
