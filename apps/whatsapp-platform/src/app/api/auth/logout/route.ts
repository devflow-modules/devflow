import { NextRequest } from "next/server";
import { jsonSuccess } from "@/lib/api-response";
import { buildClearCookieHeader, getAuthFromRequest } from "@/modules/auth";
import { revokeUserSession } from "@/modules/auth/sessionService";
import { logAuth } from "@/lib/auth-logger";
import { recordPlatformAudit } from "@/lib/platformAuditLog";
import { getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const ip = getClientIp(request);
  if (auth) {
    await revokeUserSession(auth.sessionId);
    logAuth({
      type: "logout",
      userId: auth.payload.sub,
      tenantId: auth.payload.tenantId,
      sessionId: auth.sessionId,
    });
    recordPlatformAudit({
      action: "logout",
      tenantId: auth.payload.tenantId,
      userId: auth.payload.sub,
      ip,
    });
  }

  const res = jsonSuccess({ ok: true });
  res.headers.set("Set-Cookie", buildClearCookieHeader());
  return res;
}
