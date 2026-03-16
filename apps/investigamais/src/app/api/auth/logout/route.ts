import { NextResponse } from "next/server";
import { buildClearCookieHeader } from "@/modules/auth/cookies";
import { trackUserLogout } from "@/modules/analytics";

export async function POST() {
  trackUserLogout();
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", buildClearCookieHeader());
  return res;
}
