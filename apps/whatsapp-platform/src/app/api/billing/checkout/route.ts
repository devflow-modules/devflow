import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { createBillingCheckoutSession, type CheckoutPlan } from "@/modules/billing/billingService";
import { normalizePlan } from "@/modules/billing/plans";
import { billingWriteForbiddenResponse, shouldSanitizeBillingResponse } from "@/modules/billing/billingSanitizer";

const bodySchema = z.object({
  plan: z.enum(["OPERATIONAL_BASE", "STARTER", "PRO", "SCALE", "TEAM"]),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;
  if (!auth) {
    return jsonError("UNAUTHORIZED", "Não autorizado", 401);
  }
  if (shouldSanitizeBillingResponse(auth.payload)) {
    return billingWriteForbiddenResponse();
  }

  const checkoutLim = checkRateLimit(getClientIp(request), "billing-checkout");
  if (!checkoutLim.ok) {
    return jsonError("RATE_LIMITED", "Muitas tentativas de checkout. Tente novamente em instantes.", 429, {
      headers: checkoutLim.retryAfter ? { "Retry-After": String(checkoutLim.retryAfter) } : undefined,
    });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "plan deve ser OPERATIONAL_BASE (ou legado STARTER/PRO/SCALE/TEAM)", 400);
  }

  const user = await prisma.user.findFirst({
    where: { id: auth.payload.sub, tenantId: auth.payload.tenantId },
    select: { email: true },
  });
  if (!user?.email) {
    return jsonError("USER_NOT_FOUND", "Usuário não encontrado", 404);
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_WHATSAPP_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    request.nextUrl.origin ??
    "http://localhost:3000";

  try {
    const { checkoutUrl } = await createBillingCheckoutSession(
      auth.payload.sub,
      auth.payload.tenantId,
      user.email,
      normalizePlan(parsed.data.plan) as CheckoutPlan,
      baseUrl
    );
    return jsonSuccess({ url: checkoutUrl });
  } catch (e) {
    console.error("[billing/checkout]", e);
    const msg = e instanceof Error ? e.message : "Checkout indisponível";
    return jsonError("CHECKOUT_UNAVAILABLE", msg, 502);
  }
}
