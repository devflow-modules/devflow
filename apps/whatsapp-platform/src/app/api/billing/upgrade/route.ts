import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole } from "@/modules/auth";
import { z } from "zod";
import { ensureTenantSubscription } from "@/modules/billing/subscriptionService";
import { normalizePlan } from "@/modules/billing/plans";
import type { PlanKey } from "@/modules/billing/plans";

const bodySchema = z.object({
  plan: z.enum(["STARTER", "PRO", "SCALE"]),
});

/**
 * Stub de upgrade: atualiza TenantSubscription localmente.
 * Em produção: redirecionar para Stripe Checkout.
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ["admin"], request);
  if (denied) return denied;
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "plan inválido (STARTER, PRO ou SCALE)" },
      { status: 400 }
    );
  }

  try {
    const plan = normalizePlan(parsed.data.plan) as PlanKey;
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
