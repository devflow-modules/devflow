import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCheckoutSession } from "@devflow/billing-core";
import { hashPassword, buildSetCookieHeader, signToken } from "@wa/modules/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { ensureTenantSubscription } from "@wa/modules/billing/subscriptionService";
import { normalizePlan } from "@wa/modules/billing/plans";

const bodySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  planId: z.enum(["starter", "pro", "scale"]).default("starter"),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip, "signup");
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns minutos." },
      {
        status: 429,
        headers: limit.retryAfter
          ? { "Retry-After": String(limit.retryAfter) }
          : undefined,
      }
    );
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, password, planId } = parsed.data;
  const emailLower = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  if (existing) {
    return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const tenantName = name.trim() || "Minha Empresa";

  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
      plan: planId,
    },
  });

  await ensureTenantSubscription(tenant.id, normalizePlan(planId) as "FREE" | "STARTER" | "PRO" | "SCALE");

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: emailLower,
      passwordHash,
      name: name.trim(),
      role: "admin",
    },
  });

  const token = await signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: "admin",
    tenantId: tenant.id,
  });

  if (planId === "pro") {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_WHATSAPP_APP_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        request.nextUrl.origin ??
        "http://localhost:3000";
      const result = await createCheckoutSession({
        userId: tenant.id,
        email: emailLower,
        planId: "PRO",
        successUrl: `${baseUrl}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/signup?cancel=1`,
      });
      const res = NextResponse.json({
        success: true,
        redirectUrl: result.checkoutUrl,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: tenant.id,
        },
      });
      res.headers.set("Set-Cookie", buildSetCookieHeader(token));
      return res;
    } catch (err) {
      console.error("[signup] Stripe checkout error", err);
    }
  }

  const res = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: tenant.id,
    },
    redirectTo: "/onboarding",
  });
  res.headers.set("Set-Cookie", buildSetCookieHeader(token));
  return res;
}
