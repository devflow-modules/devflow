import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_METRICS_SECRET_COOKIE_NAME, JWT_COOKIE_NAME } from "@/lib/auth-config";
import { loginUrlWithNext } from "@/lib/safe-redirect";
import { logAuth } from "@/lib/auth-logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isCommercialBillingVisible } from "@/lib/productMode";

/**
 * Validação alinhada com `getAuthFromRequest` (sessão + DB), sem duplicar regras em Edge.
 */
async function verifySessionViaApi(request: NextRequest): Promise<boolean> {
  const verifyUrl = new URL("/api/auth/verify", request.nextUrl.origin);
  const res = await fetch(verifyUrl, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });
  return res.ok;
}

function fullPathForNext(request: NextRequest): string {
  const p = request.nextUrl.pathname;
  const q = request.nextUrl.search;
  return `${p}${q}`;
}

function redirectToLoginWithNext(request: NextRequest): NextResponse {
  const path = fullPathForNext(request);
  return NextResponse.redirect(new URL(loginUrlWithNext(path), request.url));
}

/** Áreas com shell autenticado (alinhado à navegação principal). */
function requiresTenantSession(path: string): boolean {
  return (
    path.startsWith("/inbox") ||
    path.startsWith("/settings") ||
    path.startsWith("/billing") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/automation") ||
    path.startsWith("/conversations") ||
    path.startsWith("/agents") ||
    path.startsWith("/queues") ||
    path === "/distribuir" ||
    path.startsWith("/distribuir/")
  );
}

/**
 * Bypass interno Ops (exceção documentada): permite `/admin`-subset sem JWT válido quando o cliente
 * apresenta o cookie `ADMIN_METRICS_SECRET`. Não concede papel de sessão — é credencial própria.
 * Mantém‑se apenas para páginas alinhadas a `requireAdminOrMetricsSecretPage`. Manager/operator não
 * devem obter esse segredo.
 */
function metricsSecretBypass(request: NextRequest, path: string): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (
    !path.startsWith("/admin/metrics") &&
    !path.startsWith("/admin/billing") &&
    !path.startsWith("/admin/affiliates") &&
    !path.startsWith("/admin/tenants")
  )
    return false;
  const adminSecret =
    process.env.WHATSAPP_ADMIN_METRICS_SECRET ?? process.env.ADMIN_METRICS_SECRET;
  if (!adminSecret) return false;
  const adminCookie = request.cookies.get(ADMIN_METRICS_SECRET_COOKIE_NAME)?.value;
  return adminCookie === adminSecret;
}

function redirectToMetricsSecretLogin(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (!isCommercialBillingVisible()) {
    if (
      path === "/billing" ||
      path.startsWith("/billing/") ||
      path === "/dashboard/billing" ||
      path.startsWith("/dashboard/billing/") ||
      path === "/settings/billing" ||
      path.startsWith("/settings/billing/") ||
      path === "/plan" ||
      path.startsWith("/plan/") ||
      path === "/subscription" ||
      path.startsWith("/subscription/")
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (path.startsWith("/api/admin") && request.method !== "OPTIONS") {
    const ip = getClientIp(request);
    const lim = checkRateLimit(ip, "admin-api");
    if (!lim.ok) {
      const trace_id = crypto.randomUUID();
      logAuth({ type: "rate_limited", route: path, ip });
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: "RATE_LIMITED",
            message: "Demasiados pedidos. Tente novamente em breve.",
          },
          trace_id,
        },
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-Trace-Id": trace_id,
            ...(lim.retryAfter ? { "Retry-After": String(lim.retryAfter) } : {}),
          },
        }
      );
    }
  }

  if (requiresTenantSession(path)) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === "development") return NextResponse.next();
      return redirectToLoginWithNext(request);
    }
    const token = request.cookies.get(JWT_COOKIE_NAME)?.value;
    if (!token) {
      return redirectToLoginWithNext(request);
    }
    const valid = await verifySessionViaApi(request);
    if (!valid) {
      const res = redirectToLoginWithNext(request);
      res.cookies.delete(JWT_COOKIE_NAME);
      return res;
    }
    return NextResponse.next();
  }

  if (!path.startsWith("/admin")) return NextResponse.next();
  if (path === "/admin/login" || path === "/admin/login/") return NextResponse.next();

  if (metricsSecretBypass(request, path)) {
    return NextResponse.next();
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    if (process.env.NODE_ENV === "development") return NextResponse.next();
    return redirectToMetricsSecretLogin(request);
  }

  const token = request.cookies.get(JWT_COOKIE_NAME)?.value;
  if (!token) {
    const metricsOnlySecretFlow =
      process.env.NODE_ENV === "production" &&
      (path.startsWith("/admin/metrics") ||
        path.startsWith("/admin/billing") ||
        path.startsWith("/admin/affiliates") ||
        path.startsWith("/admin/tenants")) &&
      (process.env.WHATSAPP_ADMIN_METRICS_SECRET ?? process.env.ADMIN_METRICS_SECRET);
    if (metricsOnlySecretFlow) {
      return redirectToMetricsSecretLogin(request);
    }
    return redirectToLoginWithNext(request);
  }

  const valid = await verifySessionViaApi(request);
  if (!valid) {
    const res = redirectToLoginWithNext(request);
    res.cookies.delete(JWT_COOKIE_NAME);
    return res;
  }

  return NextResponse.next();
}
