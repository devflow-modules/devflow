/**
 * Resolução de linhas WhatsApp (whatsapp_phone_numbers) — sem heurística “first ACTIVE”.
 */

import { prisma } from "@/lib/prisma";
import {
  WhatsappPhoneNumberStatus,
  type WhatsappPhoneNumber,
} from "@/generated/prisma-whatsapp";
import type { ResolvedTenant } from "./resolvedTenant";

const CONNECTED_LINE_STATUSES: WhatsappPhoneNumberStatus[] = [
  WhatsappPhoneNumberStatus.ACTIVE,
  WhatsappPhoneNumberStatus.PENDING_ACTIVATION,
];

export async function resolvePrimaryPhoneNumber(
  tenantId: string
): Promise<WhatsappPhoneNumber | null> {
  const primary = await prisma.whatsappPhoneNumber.findFirst({
    where: { tenantId, isPrimary: true, status: { in: CONNECTED_LINE_STATUSES } },
  });
  if (primary) return primary;
  return prisma.whatsappPhoneNumber.findFirst({
    where: { tenantId, status: WhatsappPhoneNumberStatus.ACTIVE },
    orderBy: { updatedAt: "desc" },
  });
}

export async function resolveDefaultOutboundPhone(
  tenantId: string
): Promise<WhatsappPhoneNumber | null> {
  return prisma.whatsappPhoneNumber.findFirst({
    where: { tenantId, status: WhatsappPhoneNumberStatus.ACTIVE, isDefaultOutbound: true },
  });
}

/**
 * Resolve linha pelo phone_number_id da Meta (único global).
 */
export async function resolvePhoneNumberById(
  phoneNumberId: string
): Promise<WhatsappPhoneNumber | null> {
  if (!phoneNumberId?.trim()) return null;
  return prisma.whatsappPhoneNumber.findUnique({
    where: { phoneNumberId: phoneNumberId.trim() },
  });
}

export function whatsappRowToResolvedTenant(
  tenantId: string,
  row: WhatsappPhoneNumber
): ResolvedTenant {
  return {
    id: tenantId,
    phoneNumberId: row.phoneNumberId,
    displayPhoneNumber: row.displayPhoneNumber ?? "",
    accessToken: row.accessToken,
    channelStatus: row.status,
    whatsappPhoneNumberId: row.id,
  };
}

/**
 * Envio: usa a linha da conversa (Meta id) se existir e estiver ACTIVE; senão a linha default outbound.
 */
export async function resolveMessagingTenantForOutbound(
  tenantId: string,
  conversationBusinessPhoneNumberId: string | null | undefined
): Promise<ResolvedTenant | null> {
  const lineId = conversationBusinessPhoneNumberId?.trim();
  if (lineId) {
    const wpn = await prisma.whatsappPhoneNumber.findFirst({
      where: {
        tenantId,
        phoneNumberId: lineId,
        status: WhatsappPhoneNumberStatus.ACTIVE,
      },
    });
    if (wpn?.accessToken?.trim()) return whatsappRowToResolvedTenant(tenantId, wpn);
  }
  const def = await resolveDefaultOutboundPhone(tenantId);
  if (def?.accessToken?.trim()) return whatsappRowToResolvedTenant(tenantId, def);
  return null;
}

/** Admin / fluxos sem thread: só default outbound. */
export async function resolveMessagingTenantForTenantId(tenantId: string) {
  return resolveMessagingTenantForOutbound(tenantId, null);
}
