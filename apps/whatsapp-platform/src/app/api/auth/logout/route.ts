import { NextRequest, NextResponse } from "next/server";
import { buildClearCookieHeader, getAuthFromRequest } from "@/modules/auth";
import { revokeUserSession } from "@/modules/auth/sessionService";
import { logAuth } from "@/lib/auth-logger";

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (auth) {
    await revokeUserSession(auth.sessionId);
    logAuth({
      type: "logout",
      userId: auth.payload.sub,
      tenantId: auth.payload.tenantId,
      sessionId: auth.sessionId,
    });
  }

  const res = NextResponse.json({ success: true });
  res.headers.set("Set-Cookie", buildClearCookieHeader());
  return res;
}
