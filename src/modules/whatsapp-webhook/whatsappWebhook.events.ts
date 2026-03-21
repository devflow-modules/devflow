export const WEBHOOK_EVENT_KINDS = [
  "message",
  "status",
  "errors",
  "unknown_field",
  "unknown_object",
] as const;

export type WebhookEventKind = (typeof WEBHOOK_EVENT_KINDS)[number];
