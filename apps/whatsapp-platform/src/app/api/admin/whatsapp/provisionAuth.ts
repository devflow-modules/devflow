import type { NextRequest } from "next/server";
import { isPlatformAdmin } from "@/lib/roles";
import { logEvent } from "@/lib/observability/log-event";
import { getAuthFromRequest } from "@/modules/auth";

/** Auth por script/curl: `Authorization: Bearer WHATSAPP_MANUAL_PROVISION_SECRET`. */
export function authorizeProvisionBearer(request: NextRequest): boolean {
  const secret = process.env.WHATSAPP_MANUAL_PROVISION_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Bearer (secret) ou sessão JWT com `platform_admin` (UI interna). */
export async function authorizeProvisionOrPlatformAdmin(request: NextRequest): Promise<boolean> {
  if (authorizeProvisionBearer(request)) return true;
  const auth = await getAuthFromRequest(request);
  const ok = Boolean(auth && isPlatformAdmin(auth.payload.role));
  if (!ok) {
    logEvent("warn", "security", "admin_provision_auth_denied", {
      path: request.nextUrl.pathname,
      method: request.method,
      has_session: Boolean(auth),
      role: auth?.payload.role ?? null,
    });
  }
  return ok;
}
