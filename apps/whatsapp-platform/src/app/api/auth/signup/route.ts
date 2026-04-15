import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCheckoutSession } from "@devflow/billing-core";
import { hashPassword, buildSetCookieHeader, signToken } from "@/modules/auth";
import { createUserSession } from "@/modules/auth/sessionService";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { ensureTenantSubscription } from "@/modules/billing/subscriptionService";
import { normalizePlan } from "@/modules/billing/plans";
import { parseRequestJson } from "@/lib/parse-request-json";
import { logAuth } from "@/lib/auth-logger";
import { recordPlatformAudit } from "@/lib/platformAuditLog";
import { sendTransactionalEmail } from "@/modules/email/application/sendTransactionalEmail";
import {
  AFFILIATE_REF_COOKIE_NAME,
  buildClearAffiliateRefCookie,
  resolveSignupAffiliateRef,
} from "@/modules/affiliates/affiliateRef";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  planId: z.enum(["free", "pro"]).default("free"),
  affiliateRef: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : String(v).trim()),
    z.string().optional()
  ),
});

function prismaErrorCode(err: unknown): string | null {
  if (typeof err !== "object" || err === null) return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function isPrismaInitError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === "PrismaClientInitializationError" ||
    err.message.includes("PrismaClientInitializationError") ||
    err.message.includes("Can't reach database server")
  );
}

function signupErrorResponse(err: unknown): NextResponse {
  console.error("[signup]", err);

  if (err instanceof Error && err.message.includes("JWT_SECRET")) {
    return NextResponse.json(
      {
        error:
          "Configuração do servidor incompleta (JWT_SECRET). Defina a variável no deploy ou em .env.local.",
      },
      { status: 500 }
    );
  }

  const code = prismaErrorCode(err);
  if (code === "P2002") {
    return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
  }
  if (code === "P1001" || code === "P1000" || code === "P1017") {
    return NextResponse.json(
      { error: "Não foi possível ligar à base de dados. Verifique WHATSAPP_DATABASE_URL e tente novamente." },
      { status: 503 }
    );
  }

  if (isPrismaInitError(err)) {
    return NextResponse.json(
      { error: "Base de dados indisponível. Confirme WHATSAPP_DATABASE_URL e migrations." },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { error: "Erro ao criar conta. Tente novamente ou contacte o suporte." },
    { status: 500 }
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip, "signup");
  if (!limit.ok) {
    logAuth({ type: "rate_limited", route: "signup", ip });
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns minutos.", code: "RATE_LIMITED" },
      {
        status: 429,
        headers: limit.retryAfter ? { "Retry-After": String(limit.retryAfter) } : undefined,
      }
    );
  }

  const raw = await parseRequestJson(request);
  if (!raw.ok) {
    return NextResponse.json({ error: "Corpo JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const { name, email, password, planId, affiliateRef: affiliateRefBody } = parsed.data;
    const emailLower = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }

    const cookieRef = request.cookies.get(AFFILIATE_REF_COOKIE_NAME)?.value ?? undefined;
    const { id: resolvedAffiliateId, via: affiliateRefVia } = resolveSignupAffiliateRef(
      affiliateRefBody,
      cookieRef
    );
    let affiliateIdForTenant: string | undefined;
    if (resolvedAffiliateId) {
      const affiliateRow = await prisma.affiliate.findUnique({
        where: { id: resolvedAffiliateId },
        select: { id: true },
      });
      if (affiliateRow) affiliateIdForTenant = affiliateRow.id;
    }

    const passwordHash = await hashPassword(password);
    const tenantName = name.trim() || "Minha Empresa";

    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        plan: planId,
        ...(affiliateIdForTenant
          ? { affiliateId: affiliateIdForTenant, affiliateSource: "ref" }
          : {}),
      },
    });

    if (affiliateIdForTenant && affiliateRefVia) {
      recordPlatformAudit({
        action: "affiliate.assigned",
        tenantId: tenant.id,
        metadata: {
          affiliateId: affiliateIdForTenant,
          source: "ref",
          via: affiliateRefVia,
        },
      });
    }

    await ensureTenantSubscription(tenant.id, normalizePlan(planId));

    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: emailLower,
        passwordHash,
        name: name.trim(),
        role: "manager",
      },
    });

    const { seedDefaultAutomationRules } = await import("@/modules/automation/defaultRules.seed");
    await seedDefaultAutomationRules(tenant.id).catch((e) =>
      console.error("[signup] seedDefaultAutomationRules", e)
    );

    const baseUrl = (
      process.env.NEXT_PUBLIC_WHATSAPP_APP_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      request.nextUrl.origin ??
      "http://localhost:3000"
    ).replace(/\/$/, "");
    const loginUrl = `${baseUrl}/login`;
    const welcomeEmail = await sendTransactionalEmail({
      type: "ACCOUNT_CREATED",
      to: user.email,
      tenantId: tenant.id,
      userId: user.id,
      payload: {
        userName: user.name,
        loginUrl,
        email: user.email,
      },
    });
    if (!welcomeEmail.ok) {
      console.error("[signup] e-mail pós-cadastro falhou", welcomeEmail.errorCode);
    }

    const { sessionId } = await createUserSession(user.id);
    const token = await signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: "manager",
      tenantId: tenant.id,
      jti: sessionId,
    });

    if (planId === "pro") {
      try {
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
        res.headers.append("Set-Cookie", buildClearAffiliateRefCookie());
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
    res.headers.append("Set-Cookie", buildClearAffiliateRefCookie());
    return res;
  } catch (err) {
    try {
      return signupErrorResponse(err);
    } catch (inner) {
      console.error("[signup] falha ao montar resposta de erro", inner);
      return NextResponse.json({ error: "Erro interno ao cadastrar." }, { status: 500 });
    }
  }
}
