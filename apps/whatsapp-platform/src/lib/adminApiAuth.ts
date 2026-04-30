import type { NextRequest, NextResponse } from "next/server";
import { jsonError, newTraceId } from "@/lib/api-response";
import { authorizeProvisionBearer } from "@/lib/adminProvisionBearer";
import { getAuthFromRequest, type AuthResult } from "@/modules/auth";
import { isPlatformAdmin } from "@/lib/roles";

export type AdminJwtGateFail = { ok: false; response: NextResponse };
export type AdminJwtGateOk = { ok: true; auth: AuthResult };

/**
 * JWT de sessão com `platform_admin` apenas — rotas `/api/admin/*` (exceto automatismo com Bearer de provision).
 */
export async function gatePlatformAdminJwt(request: NextRequest): Promise<AdminJwtGateFail | AdminJwtGateOk> {
  const traceId = newTraceId();
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return { ok: false, response: jsonError("UNAUTHORIZED", "Não autorizado.", 401, { traceId }) };
  }
  if (!isPlatformAdmin(auth.payload.role)) {
    return { ok: false, response: jsonError("FORBIDDEN", "Acesso negado.", 403, { traceId }) };
  }
  return { ok: true, auth };
}

export type AdminProvisionGateFail = AdminJwtGateFail;
export type AdminProvisionGateOk =
  | { ok: true; auth: AuthResult; viaProvisionSecret: false }
  | { ok: true; auth: null; viaProvisionSecret: true };

/**
 * `Authorization: Bearer` (secret de provision) OU sessão JWT `platform_admin`.
 */
export async function gatePlatformAdminOrProvisionSecret(
  request: NextRequest
): Promise<AdminProvisionGateFail | AdminProvisionGateOk> {
  const traceId = newTraceId();
  if (authorizeProvisionBearer(request)) {
    return { ok: true, auth: null, viaProvisionSecret: true };
  }
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return { ok: false, response: jsonError("UNAUTHORIZED", "Não autorizado.", 401, { traceId }) };
  }
  if (!isPlatformAdmin(auth.payload.role)) {
    return { ok: false, response: jsonError("FORBIDDEN", "Acesso negado.", 403, { traceId }) };
  }
  return { ok: true, auth, viaProvisionSecret: false };
}
