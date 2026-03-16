import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_METRICS_COOKIE = "admin_metrics_secret";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/admin")) return NextResponse.next();
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
