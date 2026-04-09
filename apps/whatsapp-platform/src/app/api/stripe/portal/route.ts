import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { createPortalSession } from "@/modules/stripe";
import { isStripeConfigured } from "@/modules/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { success: false, error: "Stripe não configurado" },
      { status: 503 }
    );
  }

  const [tenantSub, billingSub, tenant] = await Promise.all([
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

  const stripeCustomerId =
    tenantSub?.stripeCustomerId ?? billingSub?.stripeCustomerId ?? tenant?.stripeCustomerId ?? null;

  if (!stripeCustomerId) {
    return NextResponse.json(
      { success: false, error: "Cliente Stripe não encontrado. Faça upgrade primeiro." },
      { status: 400 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_WHATSAPP_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    request.nextUrl.origin ??
    "http://localhost:3000";
  const returnUrl = `${baseUrl.replace(/\/$/, "")}/billing`;

  try {
    const { portalUrl } = await createPortalSession(stripeCustomerId, returnUrl);
    return NextResponse.json({
      success: true,
      data: { url: portalUrl },
    });
  } catch (e) {
    console.error("[stripe/portal]", e);
    const msg = e instanceof Error ? e.message : "Portal indisponível";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
