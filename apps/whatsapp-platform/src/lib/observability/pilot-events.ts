/**
 * Nomes canónicos de eventos para observabilidade mínima do piloto WhatsApp Platform.
 * Ver docs/whatsapp-platform/OBSERVABILITY-PILOT.md
 */
export const WHATSAPP_PILOT_EVENTS = {
  WEBHOOK_GET_VERIFY_RECEIVED: "webhook_get_verify_received",
  WEBHOOK_GET_VERIFY_SUCCESS: "webhook_get_verify_success",
  WEBHOOK_GET_VERIFY_FAILED: "webhook_get_verify_failed",
  WEBHOOK_POST_RECEIVED: "webhook_post_received",
  WEBHOOK_SIGNATURE_VALIDATED: "webhook_signature_validated",
  WEBHOOK_SIGNATURE_MISSING: "webhook_signature_missing",
  WEBHOOK_SIGNATURE_INVALID: "webhook_signature_invalid",
  WEBHOOK_SIGNATURE_BYPASSED: "webhook_signature_validation_bypassed",
  WEBHOOK_TENANT_RESOLVED: "webhook_tenant_resolved",
  WEBHOOK_TENANT_UNRESOLVED: "webhook_tenant_unresolved",
  INBOUND_MESSAGE_PERSISTED: "inbound_message_persisted",
  INBOUND_THREAD_CREATED: "inbound_thread_created",
  INBOUND_THREAD_UPDATED: "inbound_thread_updated",
  AI_DECISION_AUTO_REPLY: "ai_decision_auto_reply",
  AI_DECISION_HANDOFF: "ai_decision_handoff",
  AI_DECISION_NO_REPLY: "ai_decision_no_reply",
  HANDOFF_REQUESTED: "handoff_requested",
  HANDOFF_APPLIED: "handoff_applied",
  OUTBOUND_SEND_REQUESTED: "outbound_send_requested",
  OUTBOUND_SEND_SUCCESS: "outbound_send_success",
  OUTBOUND_SEND_FAILED: "outbound_send_failed",
  CLOUD_API_ERROR: "cloud_api_error",
  SSE_CLIENT_CONNECTED: "sse_client_connected",
  SSE_CLIENT_DISCONNECTED: "sse_client_disconnected",
  LEAD_CONVERTED_TO_WHATSAPP_TENANT: "lead_converted_to_whatsapp_tenant",
} as const;

export type WhatsappPilotEventName = (typeof WHATSAPP_PILOT_EVENTS)[keyof typeof WHATSAPP_PILOT_EVENTS];

export type WhatsappPilotOrigin =
  | "webhook"
  | "inbound"
  | "outbound"
  | "ia"
  | "handoff"
  | "sse"
  | "crm";
