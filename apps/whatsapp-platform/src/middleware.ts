import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_COOKIE_NAME = "whatsapp_platform_token";
const ADMIN_METRICS_COOKIE = "admin_metrics_secret";

async function verifyJwt(token: string, secret: string): Promise<{ tenantId: string; sub: string; role: string } | null> {
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

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (!path.startsWith("/admin")) return NextResponse.next();
  if (path === "/admin/login" || path === "/admin/login/") return NextResponse.next();

  const secret = process.env.JWT_SECRET;
  const token = request.cookies.get(JWT_COOKIE_NAME)?.value;

  if (path.startsWith("/admin/metrics") && process.env.NODE_ENV === "production") {
    const adminSecret = process.env.ADMIN_METRICS_SECRET;
    const adminCookie = request.cookies.get(ADMIN_METRICS_COOKIE)?.value;
    if (adminSecret && adminCookie === adminSecret) return NextResponse.next();
  }

  if (!secret) {
    if (process.env.NODE_ENV === "development") return NextResponse.next();
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const payload = await verifyJwt(token, secret);
  if (!payload) {
    const res = NextResponse.redirect(new URL("/admin/login", request.url));
    res.cookies.delete(JWT_COOKIE_NAME);
    return res;
  }

  return NextResponse.next();
}
