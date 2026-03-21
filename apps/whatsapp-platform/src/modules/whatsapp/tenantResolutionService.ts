/**
 * Resolução de tenant por phone_number_id — multi-tenant real.
 * Prioridade: WhatsappPhoneNumber (embedded signup) → Tenant legado → env fallback.
 */

import { prisma } from "@/lib/prisma";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";

export interface ResolvedTenant {
  id: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  accessToken: string;
  /** Id do WhatsappPhoneNumber quando vem de embedded signup */
  whatsappPhoneNumberId?: string;
}

/**
 * Resolve tenant pelo phone_number_id do webhook.
 * 1. Busca em WhatsappPhoneNumber (status ACTIVE)
 * 2. Fallback: Tenant legado (phoneNumberId no Tenant)
 * 3. Fallback: env (single-tenant para dev)
 */
export async function resolveTenantByPhoneNumberId(
  phoneNumberId: string
): Promise<ResolvedTenant | null> {
  const wpn = await prisma.whatsappPhoneNumber.findUnique({
    where: {
      phoneNumberId,
      status: WhatsappPhoneNumberStatus.ACTIVE,
    },
    include: { tenant: true },
  });

  if (wpn?.accessToken) {
    return {
      id: wpn.tenantId,
      phoneNumberId: wpn.phoneNumberId,
      displayPhoneNumber: wpn.displayPhoneNumber ?? "",
      accessToken: wpn.accessToken,
      whatsappPhoneNumberId: wpn.id,
    };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { phoneNumberId },
    select: {
      id: true,
      phoneNumberId: true,
      displayPhoneNumber: true,
      accessToken: true,
    },
  });

  if (tenant?.accessToken) {
    return {
      id: tenant.id,
      phoneNumberId: tenant.phoneNumberId ?? phoneNumberId,
      displayPhoneNumber: tenant.displayPhoneNumber ?? "",
      accessToken: tenant.accessToken,
    };
  }

  const envPhone = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const envToken = process.env.WHATSAPP_ACCESS_TOKEN ?? process.env.WHATSAPP_TOKEN;
  const envDisplay = process.env.WHATSAPP_DISPLAY_PHONE_NUMBER ?? "";

  if (!envPhone || !envToken || envPhone !== phoneNumberId) {
    console.log("[WHATSAPP][DEBUG] tenant env fallback failed", {
      hasEnvPhone: !!envPhone,
      hasEnvToken: !!envToken,
      envPhoneMatch: envPhone === phoneNumberId,
      phoneNumberId: phoneNumberId || "(empty)",
    });
    return null;
  }

  const upserted = await prisma.tenant.upsert({
    where: { phoneNumberId },
    create: {
      name: "Default (env)",
      phoneNumberId,
      displayPhoneNumber: envDisplay,
      accessToken: envToken,
      subdomain: `env-${phoneNumberId}`,
    },
    update: {
      accessToken: envToken,
      displayPhoneNumber: envDisplay || undefined,
    },
    select: {
      id: true,
      phoneNumberId: true,
      displayPhoneNumber: true,
      accessToken: true,
    },
  });

  return {
    id: upserted.id,
    phoneNumberId: upserted.phoneNumberId ?? phoneNumberId,
    displayPhoneNumber: upserted.displayPhoneNumber ?? "",
    accessToken: upserted.accessToken ?? envToken,
  };
}
