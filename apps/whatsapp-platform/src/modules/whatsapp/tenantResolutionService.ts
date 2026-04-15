/**
 * Resolução de tenant por phone_number_id (webhook Meta).
 * Qualquer linha registada (incl. PENDING_ACTIVATION) — persistência de inbox não depende do token.
 */

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
  if (!wpn) return null;
  return whatsappRowToResolvedTenant(wpn.tenantId, wpn);
}
