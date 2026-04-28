/**
 * Contrato de eventos realtime da inbox.
 * Payloads mínimos para atualizar a UI com eficiência.
 */

export type InboxRealtimeEventType =
  | "connected"
  | "ping"
  | "conversation.created"
  | "conversation.updated"
  | "conversation.assigned"
  | "conversation.status_changed"
  | "conversation.tags_changed"
  | "conversation.priority_changed"
  | "conversation.viewer_joined"
  | "conversation.viewer_left"
  | "message.created"
  | "message.status_updated"
  | "presence.updated"
  | "typing.start"
  | "typing.stop";

export type InboxRealtimeEventBase = {
  type: InboxRealtimeEventType;
  tenantId: string;
  ts: string;
};

export type ConversationCreatedPayload = {
  thread: {
    id: string;
    phoneNumber: string;
    contactName: string | null;
    lastMessageAt: string;
    lastMessagePreview: string | null;
    unreadCount: number;
    status: string;
    priority?: string;
    assignedToUserId?: string | null;
    lastCustomerMessageAt?: string | null;
    lastAgentReplyAt?: string | null;
    firstResponseAt?: string | null;
    createdAt: string;
  };
};

export type ConversationUpdatedPayload = {
  threadId: string;
  patch: {
    lastMessageAt?: string;
    lastMessagePreview?: string | null;
    unreadCount?: number;
    lastCustomerMessageAt?: string | null;
    lastAgentReplyAt?: string | null;
    firstResponseAt?: string | null;
  };
};

export type ConversationAssignedPayload = {
  threadId: string;
  assignedToUserId: string | null;
  assignedToUser?: { id: string; name: string; email: string } | null;
};

export type ConversationStatusChangedPayload = {
  threadId: string;
  status: string;
};

export type ConversationTagsChangedPayload = {
  threadId: string;
  tags: { id: string; name: string; color: string }[];
};

export type ConversationPriorityChangedPayload = {
  threadId: string;
  priority: string;
};

export type InboxConversationState =
  | "awaiting_agent"
  | "in_progress"
  | "awaiting_customer"
  | "closed";

export type InboxLastResponderType = "agent" | "ai" | "automation" | null;

export type InboxSlaLevel = "low" | "medium" | "high" | "critical";

export type MessageCreatedPayload = {
  threadId: string;
  message: {
    id: string;
    waMessageId: string;
    direction: "INBOUND" | "OUTBOUND";
    fromNumber: string;
    toNumber: string;
    messageType: string;
    contentText: string | null;
    ts: string;
    status: string;
    createdAt: string;
  };
  threadPatch?: {
    lastMessageAt?: string;
    lastMessagePreview?: string | null;
    unreadCount?: number;
    lastCustomerMessageAt?: string | null;
    lastAgentReplyAt?: string | null;
    firstResponseAt?: string | null;
    unansweredInboundCount?: number;
    conversationState?: InboxConversationState;
    lastResponderType?: InboxLastResponderType;
    responseDelayMs?: number | null;
    slaLevel?: InboxSlaLevel | null;
    isUnassigned?: boolean;
    lastUnansweredInboundAt?: string | null;
    /** CRM leve — score e dados extraídos */
    leadScore?: number;
    priority?: string;
    /** Inclui `prospect` (objeto) além de strings CRM legadas. */
    leadData?: Record<string, unknown> | null;
  };
};

export type MessageStatusUpdatedPayload = {
  threadId: string;
  messageId: string;
  status: string;
};

export type PresenceUpdatedPayload = {
  userId: string;
  tenantId: string;
  status: "online" | "offline";
  user?: { id: string; name: string; email: string };
};

export type ConversationViewerJoinedPayload = {
  threadId: string;
  tenantId: string;
  userId: string;
  user?: { id: string; name: string };
};

export type ConversationViewerLeftPayload = {
  threadId: string;
  tenantId: string;
  userId: string;
};

export type TypingStartPayload = {
  threadId: string;
  tenantId: string;
  userId: string;
  user?: { id: string; name: string };
};

export type TypingStopPayload = {
  threadId: string;
  tenantId: string;
  userId: string;
};

export type InboxRealtimeEvent =
  | { type: "connected"; tenantId?: string; userId?: string; ts: string }
  | { type: "ping"; ts: string }
  | (InboxRealtimeEventBase & { type: "conversation.created"; payload: ConversationCreatedPayload })
  | (InboxRealtimeEventBase & { type: "conversation.updated"; payload: ConversationUpdatedPayload })
  | (InboxRealtimeEventBase & { type: "conversation.assigned"; payload: ConversationAssignedPayload })
  | (InboxRealtimeEventBase & { type: "conversation.status_changed"; payload: ConversationStatusChangedPayload })
  | (InboxRealtimeEventBase & { type: "conversation.tags_changed"; payload: ConversationTagsChangedPayload })
  | (InboxRealtimeEventBase & { type: "conversation.priority_changed"; payload: ConversationPriorityChangedPayload })
  | (InboxRealtimeEventBase & { type: "conversation.viewer_joined"; payload: ConversationViewerJoinedPayload })
  | (InboxRealtimeEventBase & { type: "conversation.viewer_left"; payload: ConversationViewerLeftPayload })
  | (InboxRealtimeEventBase & { type: "message.created"; payload: MessageCreatedPayload })
  | (InboxRealtimeEventBase & { type: "message.status_updated"; payload: MessageStatusUpdatedPayload })
  | (InboxRealtimeEventBase & { type: "presence.updated"; payload: PresenceUpdatedPayload })
  | (InboxRealtimeEventBase & { type: "typing.start"; payload: TypingStartPayload })
  | (InboxRealtimeEventBase & { type: "typing.stop"; payload: TypingStopPayload });
