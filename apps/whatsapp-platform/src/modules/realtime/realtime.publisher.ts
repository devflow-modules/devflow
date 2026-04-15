/**
 * Publicador de eventos realtime. In-memory por instância.
 * Para multi-instância serverless, integrar Redis Pub/Sub (ver INBOX_REALTIME.md).
 */

import type { InboxRealtimeEvent } from "./realtime.types";

type Subscriber = (event: InboxRealtimeEvent) => void;

const subsByTenant = new Map<string, Set<Subscriber>>();

function getSubs(tenantId: string): Set<Subscriber> {
  let set = subsByTenant.get(tenantId);
  if (!set) {
    set = new Set();
    subsByTenant.set(tenantId, set);
  }
  return set;
}

export function subscribe(tenantId: string, fn: Subscriber): () => void {
  const set = getSubs(tenantId);
  set.add(fn);
  return () => {
    set.delete(fn);
    if (set.size === 0) subsByTenant.delete(tenantId);
  };
}

export function publish(tenantId: string, event: InboxRealtimeEvent): void {
  const set = subsByTenant.get(tenantId);
  if (!set?.size) return;
  const e = { ...event, ts: event.ts || new Date().toISOString() };
  for (const fn of set) {
    try {
      fn(e);
    } catch (err) {
      console.error("[realtime] subscriber error", err);
    }
  }
}
