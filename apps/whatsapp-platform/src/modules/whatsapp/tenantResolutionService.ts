/**
 * Resolução de tenant por phone_number_id (webhook Meta).
 * Fonte única: whatsapp_phone_numbers com status ACTIVE.
 */

import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";
import type { ResolvedTenant } from "./resolvedTenant";
import { resolvePhoneNumberById, whatsappRowToResolvedTenant } from "./whatsappPhoneResolution";

export type { ResolvedTenant } from "./resolvedTenant";

/**
 * Resolve tenant pelo phone_number_id recebido no webhook.
 */
export async function resolveTenantByPhoneNumberId(
  phoneNumberId: string
): Promise<ResolvedTenant | null> {
  const wpn = await resolvePhoneNumberById(phoneNumberId);
  if (!wpn || wpn.status !== WhatsappPhoneNumberStatus.ACTIVE || !wpn.accessToken?.trim()) {
    return null;
  }
  return whatsappRowToResolvedTenant(wpn.tenantId, wpn);
}
