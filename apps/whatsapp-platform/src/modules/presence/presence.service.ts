/**
 * Serviço de presença e colaboração.
 * Orquestra store + publicação de eventos realtime.
 */

import {
  setPresence as storeSetPresence,
  removePresence as storeRemovePresence,
  heartbeatPresence as storeHeartbeat,
  getOnlineUsers,
  addViewer as storeAddViewer,
  removeViewer as storeRemoveViewer,
  heartbeatViewer as storeHeartbeatViewer,
  setTyping as storeSetTyping,
  getThreadViewerIds,
  getTypingUserIds,
} from "./presence.store";
import { publish } from "@/modules/realtime/realtime.publisher";
import type { InboxRealtimeEvent } from "@/modules/realtime/realtime.types";

const ts = () => new Date().toISOString();

function publishEvent(tenantId: string, event: InboxRealtimeEvent): void {
  try {
    publish(tenantId, event);
  } catch (e) {
    console.error("[presence] publish failed", tenantId, event.type, e);
  }
}

/** Marca usuário como online. Chame ao conectar no SSE. */
export function setOnline(
  tenantId: string,
  userId: string,
  userInfo?: { name: string; email: string }
): void {
  storeSetPresence(tenantId, userId, userInfo);
  publishEvent(tenantId, {
    type: "presence.updated",
    tenantId,
    ts: ts(),
    payload: {
      userId,
      tenantId,
      status: "online",
      user: userInfo ? { id: userId, name: userInfo.name, email: userInfo.email } : undefined,
    },
  });
}

/** Marca usuário como offline. Chame ao desconectar. */
export function setOffline(tenantId: string, userId: string): void {
  storeRemovePresence(tenantId, userId);
  publishEvent(tenantId, {
    type: "presence.updated",
    tenantId,
    ts: ts(),
    payload: { userId, tenantId, status: "offline" },
  });
}

/** Heartbeat para manter online. Chame a cada ping do SSE. */
export function heartbeat(tenantId: string, userId: string): void {
  storeHeartbeat(tenantId, userId);
}

/** Retorna usuários online do tenant. */
export function getOnline(tenantId: string) {
  return getOnlineUsers(tenantId);
}

/** Marca usuário como visualizador da conversa. Retorna true se foi join (novo). */
export function joinThread(
  tenantId: string,
  threadId: string,
  userId: string,
  userName?: string
): boolean {
  const isNew = storeAddViewer(tenantId, threadId, userId);
  if (isNew) {
    publishEvent(tenantId, {
      type: "conversation.viewer_joined",
      tenantId,
      ts: ts(),
      payload: {
        threadId,
        tenantId,
        userId,
        user: userName ? { id: userId, name: userName } : undefined,
      },
    });
  }
  return isNew;
}

/** Remove usuário dos visualizadores. Retorna true se estava na conversa. */
export function leaveThread(tenantId: string, threadId: string, userId: string): boolean {
  const had = storeRemoveViewer(tenantId, threadId, userId);
  if (had) {
    publishEvent(tenantId, {
      type: "conversation.viewer_left",
      tenantId,
      ts: ts(),
      payload: { threadId, tenantId, userId },
    });
  }
  return had;
}

/** Heartbeat de viewer para manter na conversa. */
export function heartbeatViewer(tenantId: string, threadId: string, userId: string): void {
  storeHeartbeatViewer(tenantId, threadId, userId);
}

/** Retorna IDs dos viewers ativos. */
export function getViewers(tenantId: string, threadId: string): string[] {
  return getThreadViewerIds(tenantId, threadId);
}

/** Marca typing start/stop. Publica evento para outros usuários. */
export function setTyping(
  tenantId: string,
  threadId: string,
  userId: string,
  typing: boolean,
  userName?: string
): void {
  const changed = storeSetTyping(tenantId, threadId, userId, typing);
  if (typing && changed) {
    publishEvent(tenantId, {
      type: "typing.start",
      tenantId,
      ts: ts(),
      payload: {
        threadId,
        tenantId,
        userId,
        user: userName ? { id: userId, name: userName } : undefined,
      },
    });
  } else if (!typing && changed) {
    publishEvent(tenantId, {
      type: "typing.stop",
      tenantId,
      ts: ts(),
      payload: { threadId, tenantId, userId },
    });
  }
}

/** Retorna IDs dos usuários digitando. */
export function getTyping(tenantId: string, threadId: string): string[] {
  return getTypingUserIds(tenantId, threadId);
}
