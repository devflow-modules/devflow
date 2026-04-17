import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { z } from "zod";
import { ensureTenantSubscription } from "@/modules/billing/subscriptionService";
import { normalizePlan } from "@/modules/billing/plans";
import { billingWriteForbiddenResponse, shouldSanitizeBillingResponse } from "@/modules/billing/billingSanitizer";

const bodySchema = z.object({
  plan: z.enum(["OPERATIONAL_BASE", "STARTER", "PRO", "SCALE", "TEAM"]),
});

/**
 * Stub de upgrade: atualiza TenantSubscription localmente.
 * Em produção: redirecionar para Stripe Checkout.
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (shouldSanitizeBillingResponse(auth.payload)) {
    return billingWriteForbiddenResponse();
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "plan inválido" },
      { status: 400 }
    );
  }

  try {
    const plan = normalizePlan(parsed.data.plan);
    await ensureTenantSubscription(auth.payload.tenantId, plan, "ACTIVE");
    return NextResponse.json({
      success: true,
      data: { plan, message: "Upgrade aplicado. Em produção, use Stripe Checkout." },
    });
  } catch (e) {
    console.error("[billing/upgrade]", e);
    return NextResponse.json(
      { success: false, error: "Erro ao aplicar upgrade" },
      { status: 500 }
    );
  }
}
