import type { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";

/**
 * Tenant resolvido para webhook / envio Cloud API (credenciais da linha WPN).
 * Webhook: `accessToken` pode ser null em PENDING_ACTIVATION; envio exige ACTIVE + token.
 */
export interface ResolvedTenant {
  id: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  accessToken: string | null;
  channelStatus: WhatsappPhoneNumberStatus;
  whatsappPhoneNumberId?: string;
}
