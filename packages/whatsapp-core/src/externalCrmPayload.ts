/**
 * Payload canónico para webhooks CRM externos (integração opcional por tenant).
 * Não altera estado interno — apenas descreve o evento.
 */

export const DEVFLOW_WHATSAPP_CRM_EVENT_SOURCE = "devflow_whatsapp" as const;

export type ExternalCrmLeadEventPayload = {
  tenantId: string;
  phone: string;
  message: string;
  intent: string;
  /** Identificador estável da origem no ecossistema DevFlow. */
  source: typeof DEVFLOW_WHATSAPP_CRM_EVENT_SOURCE;
};

export function buildExternalCrmLeadEventPayload(input: {
  tenantId: string;
  phone: string;
  message: string;
  intent: string;
}): ExternalCrmLeadEventPayload {
  return {
    tenantId: input.tenantId,
    phone: input.phone,
    message: input.message,
    intent: input.intent,
    source: DEVFLOW_WHATSAPP_CRM_EVENT_SOURCE,
  };
}
