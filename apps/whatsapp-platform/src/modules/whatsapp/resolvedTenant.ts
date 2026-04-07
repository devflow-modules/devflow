/**
 * Tenant resolvido para envio Cloud API (credenciais da linha WPN).
 */
export interface ResolvedTenant {
  id: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  accessToken: string;
  whatsappPhoneNumberId?: string;
}
