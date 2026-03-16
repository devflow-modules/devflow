import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_COOKIE_NAME = "investiga_token";
const ADMIN_METRICS_COOKIE = "admin_metrics_secret";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/admin")) {
    if (path === "/admin/login" || path === "/admin/login/") return NextResponse.next();
    if (process.env.NODE_ENV === "production") {
      const secret = process.env.ADMIN_METRICS_SECRET;
      const cookie = request.cookies.get(ADMIN_METRICS_COOKIE)?.value;
      if (!secret || cookie !== secret) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
    }
    return NextResponse.next();
  }

  if (!path.startsWith("/dashboard")) return NextResponse.next();
  const token = request.cookies.get(JWT_COOKIE_NAME)?.value;
  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", path);
    return NextResponse.redirect(login);
  }
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete(JWT_COOKIE_NAME);
    return res;
  }
}
