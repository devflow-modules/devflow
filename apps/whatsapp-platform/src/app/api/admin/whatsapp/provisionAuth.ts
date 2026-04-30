import type { NextRequest } from "next/server";
import { logEvent } from "@/lib/observability/log-event";
import { getAuthFromRequest } from "@/modules/auth";
import { isPlatformAdmin } from "@/lib/roles";
import { authorizeProvisionBearer } from "@/lib/adminProvisionBearer";

/** Re-export para scripts e chamadas `curl` contra rotas provision (ex.: WhatsApp Meta). */
export { authorizeProvisionBearer } from "@/lib/adminProvisionBearer";

/** Bearer (secret do ambiente) ou sessão JWT com `platform_admin` (UI interna). */
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
