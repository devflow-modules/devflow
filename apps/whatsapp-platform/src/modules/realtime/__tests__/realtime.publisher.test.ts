import { describe, it, expect, beforeEach } from "vitest";
import { subscribe, publish } from "../realtime.publisher";
import type { InboxRealtimeEvent } from "../realtime.types";

describe("realtime.publisher", () => {
  beforeEach(() => {
    // Limpar subscribers entre testes (o módulo mantém estado global)
    // Cada teste usa tenantIds únicos para evitar interferência
  });

  it("notifica apenas subscribers do tenant correto", () => {
    const tenantA: InboxRealtimeEvent = {
      type: "message.created",
      tenantId: "tenant-a",
      ts: new Date().toISOString(),
      payload: { threadId: "t1", message: {} as never },
    };
    const tenantB: InboxRealtimeEvent = {
      type: "message.created",
      tenantId: "tenant-b",
      ts: new Date().toISOString(),
      payload: { threadId: "t2", message: {} as never },
    };

    const receivedA: InboxRealtimeEvent[] = [];
    const receivedB: InboxRealtimeEvent[] = [];

    subscribe("tenant-a", (e) => receivedA.push(e));
    subscribe("tenant-b", (e) => receivedB.push(e));

    publish("tenant-a", tenantA);
    publish("tenant-b", tenantB);

    expect(receivedA).toHaveLength(1);
    expect(receivedB).toHaveLength(1);
    const ea = receivedA[0];
    const eb = receivedB[0];
    expect(ea.type).toBe("message.created");
    expect(eb.type).toBe("message.created");
    if (ea.type === "message.created") expect(ea.tenantId).toBe("tenant-a");
    if (eb.type === "message.created") expect(eb.tenantId).toBe("tenant-b");
  });

  it("tenant B não recebe eventos de tenant A", () => {
    const receivedB: InboxRealtimeEvent[] = [];
    subscribe("tenant-b", (e) => receivedB.push(e));

    publish("tenant-a", {
      type: "conversation.assigned",
      tenantId: "tenant-a",
      ts: new Date().toISOString(),
      payload: { threadId: "t1", assignedToUserId: "u1", assignedToUser: null },
    });

    expect(receivedB).toHaveLength(0);
  });

  it("unsubscribe para de receber eventos", () => {
    const received: InboxRealtimeEvent[] = [];
    const unsub = subscribe("tenant-x", (e) => received.push(e));

    publish("tenant-x", {
      type: "ping",
      tenantId: "tenant-x",
      ts: new Date().toISOString(),
      payload: {} as never,
    } as InboxRealtimeEvent);
    expect(received).toHaveLength(1);

    unsub();
    publish("tenant-x", {
      type: "ping",
      tenantId: "tenant-x",
      ts: new Date().toISOString(),
      payload: {} as never,
    } as InboxRealtimeEvent);
    expect(received).toHaveLength(1);
  });
});
