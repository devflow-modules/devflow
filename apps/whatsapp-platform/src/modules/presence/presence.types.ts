/**
 * Tipos para presença e colaboração em tempo real.
 */

export type PresenceStatus = "online" | "offline";

export type OnlineUser = {
  userId: string;
  tenantId: string;
  name?: string;
  email?: string;
  lastSeen: number;
};

export type PresenceUpdatedPayload = {
  userId: string;
  tenantId: string;
  status: PresenceStatus;
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
