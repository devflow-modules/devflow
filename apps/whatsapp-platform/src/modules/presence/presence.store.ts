/**
 * Store in-memory para presença, viewers e typing.
 * Redis-ready: pode trocar implementação mantendo a interface.
 */

const PRESENCE_TTL_MS = 60_000; // 60s sem heartbeat → offline
const TYPING_TTL_MS = 5_000; // 5s sem atualização → typing.stop
const VIEWER_TTL_MS = 90_000; // 90s sem heartbeat → viewer_left

type UserInfo = { name: string; email: string };

// tenantId → userId → { lastSeen, userInfo }
const presenceMap = new Map<string, Map<string, { lastSeen: number; userInfo?: UserInfo }>>();

// tenantId → threadId → Map<userId, lastSeen>
const viewerMap = new Map<string, Map<string, Map<string, number>>>();

// tenantId → threadId → userId → expiresAt
const typingMap = new Map<string, Map<string, Map<string, number>>>();

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [tenantId, users] of presenceMap) {
      for (const [userId, data] of users) {
        if (now - data.lastSeen > PRESENCE_TTL_MS) users.delete(userId);
      }
      if (users.size === 0) presenceMap.delete(tenantId);
    }
    for (const [tenantId, threads] of viewerMap) {
      for (const [threadId, users] of threads) {
        for (const [userId, lastSeen] of users) {
          if (now - lastSeen > VIEWER_TTL_MS) users.delete(userId);
        }
        if (users.size === 0) threads.delete(threadId);
      }
      if (threads.size === 0) viewerMap.delete(tenantId);
    }
    for (const [tenantId, threads] of typingMap) {
      for (const [threadId, users] of threads) {
        for (const [userId, expiresAt] of users) {
          if (now > expiresAt) users.delete(userId);
        }
        if (users.size === 0) threads.delete(threadId);
      }
      if (threads.size === 0) typingMap.delete(tenantId);
    }
  }, 10_000);
}

export function setPresence(
  tenantId: string,
  userId: string,
  userInfo?: UserInfo
): void {
  ensureCleanup();
  let users = presenceMap.get(tenantId);
  if (!users) {
    users = new Map();
    presenceMap.set(tenantId, users);
  }
  users.set(userId, { lastSeen: Date.now(), userInfo });
}

export function removePresence(tenantId: string, userId: string): void {
  const users = presenceMap.get(tenantId);
  if (users) {
    users.delete(userId);
    if (users.size === 0) presenceMap.delete(tenantId);
  }
}

export function heartbeatPresence(tenantId: string, userId: string): void {
  const users = presenceMap.get(tenantId);
  const entry = users?.get(userId);
  if (entry) entry.lastSeen = Date.now();
}

export function getOnlineUserIds(tenantId: string): string[] {
  const users = presenceMap.get(tenantId);
  if (!users) return [];
  const now = Date.now();
  return Array.from(users.entries())
    .filter(([, data]) => now - data.lastSeen < PRESENCE_TTL_MS)
    .map(([uid]) => uid);
}

export function getOnlineUsers(
  tenantId: string
): Array<{ userId: string; name?: string; email?: string }> {
  const users = presenceMap.get(tenantId);
  if (!users) return [];
  const now = Date.now();
  return Array.from(users.entries())
    .filter(([, data]) => now - data.lastSeen < PRESENCE_TTL_MS)
    .map(([userId, data]) => ({
      userId,
      name: data.userInfo?.name,
      email: data.userInfo?.email,
    }));
}

export function addViewer(tenantId: string, threadId: string, userId: string): boolean {
  let threads = viewerMap.get(tenantId);
  if (!threads) {
    threads = new Map();
    viewerMap.set(tenantId, threads);
  }
  let users = threads.get(threadId);
  if (!users) {
    users = new Map();
    threads.set(threadId, users);
  }
  const wasNew = !users.has(userId);
  users.set(userId, Date.now());
  return wasNew;
}

export function removeViewer(tenantId: string, threadId: string, userId: string): boolean {
  const threads = viewerMap.get(tenantId);
  const users = threads?.get(threadId);
  if (!users) return false;
  const had = users.has(userId);
  users.delete(userId);
  if (users.size === 0) threads?.delete(threadId);
  if (threads?.size === 0) viewerMap.delete(tenantId);
  return had;
}

export function heartbeatViewer(tenantId: string, threadId: string, userId: string): void {
  const threads = viewerMap.get(tenantId);
  const users = threads?.get(threadId);
  if (users && users.has(userId)) users.set(userId, Date.now());
}

export function getThreadViewerIds(tenantId: string, threadId: string): string[] {
  const threads = viewerMap.get(tenantId);
  const users = threads?.get(threadId);
  if (!users) return [];
  const now = Date.now();
  return Array.from(users.entries())
    .filter(([, lastSeen]) => now - lastSeen < VIEWER_TTL_MS)
    .map(([uid]) => uid);
}

export function setTyping(
  tenantId: string,
  threadId: string,
  userId: string,
  typing: boolean
): boolean {
  let threads = typingMap.get(tenantId);
  if (!threads) {
    threads = new Map();
    typingMap.set(tenantId, threads);
  }
  let users = threads.get(threadId);
  if (!users) {
    users = new Map();
    threads.set(threadId, users);
  }
  if (typing) {
    users.set(userId, Date.now() + TYPING_TTL_MS);
    return true;
  }
  const had = users.has(userId);
  users.delete(userId);
  if (users.size === 0) threads.delete(threadId);
  if (threads.size === 0) typingMap.delete(tenantId);
  return had;
}

export function getTypingUserIds(tenantId: string, threadId: string): string[] {
  const threads = typingMap.get(tenantId);
  const users = threads?.get(threadId);
  if (!users) return [];
  const now = Date.now();
  return Array.from(users.entries())
    .filter(([, expiresAt]) => now < expiresAt)
    .map(([uid]) => uid);
}
