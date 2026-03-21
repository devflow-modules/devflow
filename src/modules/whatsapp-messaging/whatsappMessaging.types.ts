export const MessagingBlockedReason = {
  NONE: "NONE",
  TOKEN_MISSING: "TOKEN_MISSING",
  TOKEN_INVALID: "TOKEN_INVALID",
  PHONE_NUMBER_ID_MISSING: "PHONE_NUMBER_ID_MISSING",
  PHONE_NUMBER_NOT_REGISTERED: "PHONE_NUMBER_NOT_REGISTERED",
  WEBHOOK_VERIFY_TOKEN_MISSING: "WEBHOOK_VERIFY_TOKEN_MISSING",
  META_PERMISSION_DENIED: "META_PERMISSION_DENIED",
  META_API_ERROR: "META_API_ERROR",
  UNKNOWN: "UNKNOWN",
} as const;

export type MessagingBlockedReasonType =
  (typeof MessagingBlockedReason)[keyof typeof MessagingBlockedReason];

export interface SendTextMessageResult {
  success: boolean;
  messageId: string | null;
  metaResponseSummary: string | null;
  idempotent: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  httpStatus: number | null;
}

export interface MessagingHealthPayload {
  envOk: boolean;
  tokenOk: boolean;
  wabaOk: boolean;
  phoneNumberIdOk: boolean;
  webhookVerifyTokenConfigured: boolean;
  readyToVerifyWebhook: boolean;
  readyToReceiveEvents: boolean;
  readyToSendMessages: boolean;
  blockedReason: MessagingBlockedReasonType;
  metaSummary: {
    apiVersion: string;
    phoneProbeStatus: number | null;
    wabaProbeStatus: number | null;
    persistedRegistered: boolean | null;
  };
  persistenceOk: boolean;
  messagesStored: number;
  lastMessageStoredAt: string | null;
}
