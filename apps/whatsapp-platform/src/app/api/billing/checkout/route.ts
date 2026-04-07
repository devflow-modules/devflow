import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest, requireRole } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { createBillingCheckoutSession, type CheckoutPlan } from "@/modules/billing/billingService";

const bodySchema = z.object({
  plan: z.enum(["STARTER", "PRO", "SCALE"]),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ["admin"], request);
  if (denied) return denied;
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "plan deve ser STARTER, PRO ou SCALE" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findFirst({
    where: { id: auth.payload.sub, tenantId: auth.payload.tenantId },
    select: { email: true },
  });
  if (!user?.email) {
    return NextResponse.json({ success: false, error: "Usuário não encontrado" }, { status: 404 });
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
      parsed.data.plan as CheckoutPlan,
      baseUrl
    );
    return NextResponse.json({
      success: true,
      data: { url: checkoutUrl },
    });
  } catch (e) {
    console.error("[billing/checkout]", e);
    const msg = e instanceof Error ? e.message : "Checkout indisponível";
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
