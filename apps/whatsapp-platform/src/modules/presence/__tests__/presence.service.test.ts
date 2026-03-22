import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPublish = vi.fn();
vi.mock("@/modules/realtime/realtime.publisher", () => ({
  publish: (...args: unknown[]) => mockPublish(...args),
}));

describe("presence.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("setOnline publica presence.updated com status online", async () => {
    const { setOnline } = await import("../presence.service");
    setOnline("t1", "u1", { name: "User 1", email: "u1@test.com" });
    expect(mockPublish).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({
        type: "presence.updated",
        payload: expect.objectContaining({
          userId: "u1",
          tenantId: "t1",
          status: "online",
          user: { id: "u1", name: "User 1", email: "u1@test.com" },
        }),
      })
    );
  });

  it("setOffline publica presence.updated com status offline", async () => {
    const { setOffline } = await import("../presence.service");
    setOffline("t1", "u1");
    expect(mockPublish).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({
        type: "presence.updated",
        payload: expect.objectContaining({
          userId: "u1",
          tenantId: "t1",
          status: "offline",
        }),
      })
    );
  });
});
