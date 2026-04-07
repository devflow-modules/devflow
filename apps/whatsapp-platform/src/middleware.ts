import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JWT_COOKIE_NAME = "whatsapp_platform_token";
const ADMIN_METRICS_COOKIE = "admin_metrics_secret";

/**
 * Validação alinhada com `getAuthFromRequest` (sessão + DB), sem duplicar regras em Edge.
 * Evita tokens revogados ou sem `jti` continuarem a abrir páginas só com assinatura JWT.
 */
async function verifySessionViaApi(request: NextRequest): Promise<boolean> {
  const verifyUrl = new URL("/api/auth/verify", request.nextUrl.origin);
  const res = await fetch(verifyUrl, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });
  return res.ok;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (
    path.startsWith("/inbox") ||
    path.startsWith("/settings") ||
    path.startsWith("/billing") ||
    path.startsWith("/dashboard/billing")
  ) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === "development") return NextResponse.next();
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const token = request.cookies.get(JWT_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const valid = await verifySessionViaApi(request);
    if (!valid) {
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.cookies.delete(JWT_COOKIE_NAME);
      return res;
    }
    return NextResponse.next();
  }

  if (!path.startsWith("/admin")) return NextResponse.next();
  if (path === "/admin/login" || path === "/admin/login/") return NextResponse.next();

  const secret = process.env.JWT_SECRET;

  if (
    (path.startsWith("/admin/metrics") || path.startsWith("/admin/billing")) &&
    process.env.NODE_ENV === "production"
  ) {
    const adminSecret =
      process.env.WHATSAPP_ADMIN_METRICS_SECRET ?? process.env.ADMIN_METRICS_SECRET;
    const adminCookie = request.cookies.get(ADMIN_METRICS_COOKIE)?.value;
    if (adminSecret && adminCookie === adminSecret) return NextResponse.next();
  }

  if (!secret) {
    if (process.env.NODE_ENV === "development") return NextResponse.next();
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const token = request.cookies.get(JWT_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const valid = await verifySessionViaApi(request);
  if (!valid) {
    const res = NextResponse.redirect(new URL("/admin/login", request.url));
    res.cookies.delete(JWT_COOKIE_NAME);
    return res;
  }

  return NextResponse.next();
}
