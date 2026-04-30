import type { NextRequest } from "next/server";

/** Automação/script: cabeçalho `Authorization: Bearer WHATSAPP_MANUAL_PROVISION_SECRET`. */
export function authorizeProvisionBearer(request: NextRequest): boolean {
  const secret = process.env.WHATSAPP_MANUAL_PROVISION_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
