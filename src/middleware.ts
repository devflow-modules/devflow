import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { updateSession } from "@/lib/supabase/middleware-client";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { logAuth } from "@wa/lib/auth-logger";
import {
  formatGovernanceDevWarning,
  getRouteGovernance,
  shouldEmitGovernanceDevWarning,
} from "@/lib/routing-governance";
import { getFinanceiroCutoverRedirectUrl } from "@devflow/financeiro-routes";

const ADMIN_METRICS_COOKIE = "admin_metrics_secret";

/**
 * Paths que exigem JWT WhatsApp neste app.
 * Não incluir `/billing` aqui: redirect server-side para o app Financeiro (Stripe).
 * Billing do WhatsApp fica no app `apps/whatsapp-platform` (e/ou `/dashboard/billing` se existir).
 * Mapa: docs/site/ROTAS-POR-APLICACAO.md
 */
const WHATSAPP_PROTECTED_PATHS = [
  "/inbox",
  "/settings",
  "/dashboard/billing",
  "/dashboard/whatsapp",
  "/onboarding",
  "/automation",
];
const isWhatsappProtected = (path: string) =>
  WHATSAPP_PROTECTED_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

/** Paths admin exceto login. */
const isAdminPath = (path: string) =>
  path.startsWith("/admin") && path !== "/admin/login" && !path.startsWith("/admin/login/");

async function verifyJwt(
  token: string,
  secret: string
): Promise<{ tenantId: string; sub: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const tenantId = payload.tenantId as string | undefined;
    const sub = payload.sub as string | undefined;
    const role = payload.role as string | undefined;
    if (tenantId && sub && role) return { tenantId, sub, role };
    return null;
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest, clearCookie = false): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  const res = NextResponse.redirect(url);
  if (clearCookie) res.cookies.delete(JWT_COOKIE_NAME);
  return res;
}

function redirectToAdminLogin(request: NextRequest, clearCookie = false): NextResponse {
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  const res = NextResponse.redirect(url);
  if (clearCookie) res.cookies.delete(JWT_COOKIE_NAME);
  return res;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Governança de rotas (somente dev): avisa paths em Fase 2+ — docs/architecture/ROUTING_POLICY.md
  if (process.env.NODE_ENV === "development") {
    const gov = getRouteGovernance(path);
    if (gov && shouldEmitGovernanceDevWarning(gov)) {
      console.warn(`[devflow/routing-governance] ${formatGovernanceDevWarning(path, gov)}`);
    }
  }

  // Cutover Financeiro (Bloco B): operacional no app canônico; portal = landing + redirect /demo → app.
  const financeiroCutoverTarget = getFinanceiroCutoverRedirectUrl(request);
  if (financeiroCutoverTarget) {
    return NextResponse.redirect(financeiroCutoverTarget, 308);
  }

  // 1. Proteção JWT para rotas WhatsApp (inbox, settings, billing, dashboard, onboarding, automation)
  if (isWhatsappProtected(path)) {
    const secret = process.env.JWT_SECRET;
    const token = request.cookies.get(JWT_COOKIE_NAME)?.value;

    if (!secret) {
      if (process.env.NODE_ENV === "development") return await updateSession(request);
      return redirectToLogin(request);
    }
    if (!token) return redirectToLogin(request);

    const payload = await verifyJwt(token, secret);
    if (!payload) {
      logAuth({ type: "token_expired", path });
      return redirectToLogin(request, true);
    }

    return await updateSession(request);
  }

  // 2. Proteção admin (exceto /admin/login)
  if (isAdminPath(path)) {
    if (
      (path.startsWith("/admin/metrics") || path.startsWith("/admin/billing")) &&
      process.env.NODE_ENV === "production"
    ) {
      const adminSecret =
        process.env.WHATSAPP_ADMIN_METRICS_SECRET ?? process.env.ADMIN_METRICS_SECRET;
      const adminCookie = request.cookies.get(ADMIN_METRICS_COOKIE)?.value;
      if (adminSecret && adminCookie === adminSecret) return await updateSession(request);
    }

    const secret = process.env.JWT_SECRET;
    const token = request.cookies.get(JWT_COOKIE_NAME)?.value;

    if (!secret) {
      if (process.env.NODE_ENV === "development") return await updateSession(request);
      return redirectToAdminLogin(request);
    }
    if (!token) return redirectToAdminLogin(request);

    const payload = await verifyJwt(token, secret);
    if (!payload) {
      logAuth({ type: "token_expired", path });
      return redirectToAdminLogin(request, true);
    }

    return await updateSession(request);
  }

  // 3. Demais rotas: Supabase (financeiro) ou next
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
