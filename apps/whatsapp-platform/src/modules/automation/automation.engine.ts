/**
 * Orquestrador principal da automação.
 */

import { dispatchEvent } from "./trigger.dispatcher";
import type { AutomationTriggerType } from "./automation.types";

export { dispatchEvent };

export async function dispatchMessageInbound(
  tenantId: string,
  threadId: string,
  messageId: string,
  messageText: string | null
): Promise<void> {
  await dispatchEvent({
    triggerType: "MESSAGE_INBOUND",
    tenantId,
    threadId,
    messageId,
    messageText: messageText ?? undefined,
    direction: "INBOUND",
  });
}

export async function dispatchMessageOutbound(
  tenantId: string,
  threadId: string
): Promise<void> {
  await dispatchEvent({
    triggerType: "MESSAGE_OUTBOUND",
    tenantId,
    threadId,
    direction: "OUTBOUND",
  });
}

export async function dispatchConversationCreated(
  tenantId: string,
  threadId: string
): Promise<void> {
  await dispatchEvent({
    triggerType: "CONVERSATION_CREATED",
    tenantId,
    threadId,
  });
}

export async function dispatchStatusChanged(
  tenantId: string,
  threadId: string,
  status: string
): Promise<void> {
  await dispatchEvent({
    triggerType: "STATUS_CHANGED",
    tenantId,
    threadId,
    status,
  });
}

export async function dispatchTagAdded(
  tenantId: string,
  threadId: string,
  tagId: string,
  tagName?: string
): Promise<void> {
  await dispatchEvent({
    triggerType: "TAG_ADDED",
    tenantId,
    threadId,
    tagId,
    tagName,
  });
}

export async function dispatchTagRemoved(
  tenantId: string,
  threadId: string,
  tagId: string
): Promise<void> {
  await dispatchEvent({
    triggerType: "TAG_REMOVED",
    tenantId,
    threadId,
    tagId,
  });
}
