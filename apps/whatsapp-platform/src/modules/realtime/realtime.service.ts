/**
 * Serviço de publicação de eventos realtime.
 * Chame publishInboxEvent após persistência bem-sucedida.
 */

import { publish } from "./realtime.publisher";
import {
  eventConversationCreated,
  eventConversationUpdated,
  eventConversationAssigned,
  eventConversationStatusChanged,
  eventConversationTagsChanged,
  eventConversationPriorityChanged,
  eventMessageCreated,
  eventMessageStatusUpdated,
} from "./realtime.events";
import type { InboxRealtimeEvent } from "./realtime.types";

export function publishInboxEvent(tenantId: string, event: InboxRealtimeEvent): void {
  if (!tenantId) return;
  try {
    publish(tenantId, event);
  } catch (e) {
    console.error("[realtime] publish failed", tenantId, event.type, e);
  }
}

export {
  eventConversationCreated,
  eventConversationUpdated,
  eventConversationAssigned,
  eventConversationStatusChanged,
  eventConversationTagsChanged,
  eventConversationPriorityChanged,
  eventMessageCreated,
  eventMessageStatusUpdated,
};
