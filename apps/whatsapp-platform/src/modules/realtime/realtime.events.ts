/**
 * Helpers para criar eventos realtime com payload consistente.
 */

import type {
  InboxRealtimeEvent,
  ConversationCreatedPayload,
  ConversationUpdatedPayload,
  ConversationAssignedPayload,
  ConversationStatusChangedPayload,
  ConversationTagsChangedPayload,
  ConversationPriorityChangedPayload,
  MessageCreatedPayload,
  MessageStatusUpdatedPayload,
} from "./realtime.types";

const ts = () => new Date().toISOString();

export function eventConversationCreated(tenantId: string, payload: ConversationCreatedPayload): InboxRealtimeEvent {
  return { type: "conversation.created", tenantId, ts: ts(), payload };
}

export function eventConversationUpdated(tenantId: string, payload: ConversationUpdatedPayload): InboxRealtimeEvent {
  return { type: "conversation.updated", tenantId, ts: ts(), payload };
}

export function eventConversationAssigned(tenantId: string, payload: ConversationAssignedPayload): InboxRealtimeEvent {
  return { type: "conversation.assigned", tenantId, ts: ts(), payload };
}

export function eventConversationStatusChanged(
  tenantId: string,
  payload: ConversationStatusChangedPayload
): InboxRealtimeEvent {
  return { type: "conversation.status_changed", tenantId, ts: ts(), payload };
}

export function eventConversationTagsChanged(
  tenantId: string,
  payload: ConversationTagsChangedPayload
): InboxRealtimeEvent {
  return { type: "conversation.tags_changed", tenantId, ts: ts(), payload };
}

export function eventConversationPriorityChanged(
  tenantId: string,
  payload: ConversationPriorityChangedPayload
): InboxRealtimeEvent {
  return { type: "conversation.priority_changed", tenantId, ts: ts(), payload };
}

export function eventMessageCreated(tenantId: string, payload: MessageCreatedPayload): InboxRealtimeEvent {
  return { type: "message.created", tenantId, ts: ts(), payload };
}

export function eventMessageStatusUpdated(tenantId: string, payload: MessageStatusUpdatedPayload): InboxRealtimeEvent {
  return { type: "message.status_updated", tenantId, ts: ts(), payload };
}
