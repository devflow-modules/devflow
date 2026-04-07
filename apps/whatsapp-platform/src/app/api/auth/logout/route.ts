import { NextRequest, NextResponse } from "next/server";
import { buildClearCookieHeader, getAuthFromRequest } from "@/modules/auth";
import { logAuth } from "@/lib/auth-logger";

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (auth) {
    logAuth({ type: "logout", userId: auth.payload.sub, tenantId: auth.payload.tenantId });
  }

  const res = NextResponse.json({ success: true });
  res.headers.set("Set-Cookie", buildClearCookieHeader());
  return res;
}
