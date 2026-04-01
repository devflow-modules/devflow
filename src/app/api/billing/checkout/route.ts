import { NextRequest } from "next/server";
import { createCheckoutSession } from "@devflow/billing-core";
import { requireSessionOnly } from "@/app/api/_helpers/auth";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { z } from "zod";
import { trackCheckoutStarted } from "@/modules/billing/billingAnalytics";

const checkoutBodySchema = z.object({
  planId: z.enum(["PRO", "TEAM"]),
});

export async function POST(request: NextRequest) {
  const auth = await requireSessionOnly(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parseResult = checkoutBodySchema.safeParse(body);
    if (!parseResult.success) {
      return sendError("planId inválido (use PRO ou TEAM)", 400, parseResult.error.format());
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin ?? "http://localhost:3000";
    const planQ = encodeURIComponent(parseResult.data.planId);
    const successUrl = `${baseUrl}/upgrade?success=1&plan=${planQ}`;
    const cancelUrl = `${baseUrl}/upgrade?cancel=1&plan=${planQ}`;

    const result = await createCheckoutSession({
      userId: auth.userId,
      email: auth.email,
      planId: parseResult.data.planId,
      successUrl,
      cancelUrl,
    });

    trackCheckoutStarted({ userId: auth.userId, planId: parseResult.data.planId });

    return sendSuccess({ checkoutUrl: result.checkoutUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar checkout";
    if (message.includes("STRIPE_") || message.includes("is not set")) {
      return sendError("Pagamentos não configurados", 503, undefined, "BILLING_NOT_CONFIGURED");
    }
    console.error("[billing/checkout]", error);
    return sendError(message, 500, error);
  }
}
