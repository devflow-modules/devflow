import { NextResponse } from "next/server";

const ADMIN_METRICS_COOKIE = "admin_metrics_secret";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

export async function POST(request: Request) {
  const secret = process.env.ADMIN_METRICS_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Admin metrics not configured" }, { status: 503 });
  }
  let body: { secret?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const submitted = body.secret;
  if (typeof submitted !== "string" || submitted !== secret) {
    return NextResponse.json({ error: "Segredo inválido." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_METRICS_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
