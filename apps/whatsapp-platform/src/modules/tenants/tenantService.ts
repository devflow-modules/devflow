/**
 * Serviço de tenant — resolução por phoneNumberId (DB ou env single-tenant).
 */

import { findTenantByPhoneNumberId } from "./tenantsRepository";

export interface ResolvedTenant {
  id: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  accessToken: string;
}

/**
 * Resolve tenant pelo phone_number_id do webhook.
 * Se existir tenant no DB, retorna; senão, se houver env WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN, retorna tenant virtual (id "env").
 */
export async function resolveTenantByPhoneNumberId(phoneNumberId: string): Promise<ResolvedTenant | null> {
  const fromDb = await findTenantByPhoneNumberId(phoneNumberId).catch(() => null);
  if (fromDb) {
    return {
      id: fromDb.id,
      phoneNumberId: fromDb.phone_number_id,
      displayPhoneNumber: fromDb.display_phone_number ?? "",
      accessToken: fromDb.access_token,
    };
  }
  const envPhone = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const envToken = process.env.WHATSAPP_ACCESS_TOKEN ?? process.env.WHATSAPP_TOKEN;
  if (envPhone && envToken && envPhone === phoneNumberId) {
    return {
      id: "env",
      phoneNumberId: envPhone,
      displayPhoneNumber: process.env.WHATSAPP_DISPLAY_PHONE_NUMBER ?? "",
      accessToken: envToken,
    };
  }
  return null;
}
