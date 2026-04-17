import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { createCheckoutSession, isStripeConfigured, type StripePlanKey } from "@/modules/stripe";
import { billingWriteForbiddenResponse, shouldSanitizeBillingResponse } from "@/modules/billing/billingSanitizer";

const bodySchema = z.object({
  plan: z.enum(["OPERATIONAL_BASE", "PRO", "SCALE"]),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }
  if (shouldSanitizeBillingResponse(auth.payload)) {
    return billingWriteForbiddenResponse();
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { success: false, error: "Stripe não configurado" },
      { status: 503 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "plan deve ser OPERATIONAL_BASE, PRO ou SCALE" },
      { status: 400 }
    );
  }

  const [user, tenantSub, billingSub, tenant] = await Promise.all([
    prisma.user.findFirst({
      where: { id: auth.payload.sub, tenantId: auth.payload.tenantId },
      select: { email: true },
    }),
    prisma.tenantSubscription.findUnique({
      where: { tenantId: auth.payload.tenantId },
      select: { stripeCustomerId: true },
    }),
    prisma.billingSubscription.findUnique({
      where: { tenantId: auth.payload.tenantId },
      select: { stripeCustomerId: true },
    }),
    prisma.tenant.findUnique({
      where: { id: auth.payload.tenantId },
      select: { stripeCustomerId: true },
    }),
  ]);

  if (!user?.email) {
    return NextResponse.json({ success: false, error: "Usuário não encontrado" }, { status: 404 });
  }

  const stripeCustomerId =
    tenantSub?.stripeCustomerId ?? billingSub?.stripeCustomerId ?? tenant?.stripeCustomerId ?? null;

  const baseUrl =
    process.env.NEXT_PUBLIC_WHATSAPP_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    request.nextUrl.origin ??
    "http://localhost:3000";
  const successUrl = `${baseUrl.replace(/\/$/, "")}/billing?success=true`;
  const cancelUrl = `${baseUrl.replace(/\/$/, "")}/billing?canceled=true`;

  try {
    const { checkoutUrl } = await createCheckoutSession({
      userId: auth.payload.sub,
      tenantId: auth.payload.tenantId,
      email: user.email,
      plan: parsed.data.plan as StripePlanKey,
      successUrl,
      cancelUrl,
      stripeCustomerId,
    });
    return NextResponse.json({
      success: true,
      data: { url: checkoutUrl },
    });
  } catch (e) {
    console.error("[stripe/checkout]", e);
    const msg = e instanceof Error ? e.message : "Checkout indisponível";
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
