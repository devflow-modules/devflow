import type { NextRequest } from "next/server";
import { isPlatformAdmin } from "@/lib/roles";
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
  return Boolean(auth && isPlatformAdmin(auth.payload.role));
}
