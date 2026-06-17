import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createNangoConnectionDisconnectProvider,
  type NangoConnectionDisconnectSdk,
} from "./nango-connection-disconnect-provider.js";

const listConnections = vi.fn();
const deleteConnection = vi.fn();

const sdk: NangoConnectionDisconnectSdk = {
  listConnections,
  deleteConnection,
};

describe("createNangoConnectionDisconnectProvider", () => {
  beforeEach(() => {
    listConnections.mockReset();
    deleteConnection.mockReset();
  });

  it("returns not_found when no connection exists", async () => {
    listConnections.mockResolvedValue({ connections: [] });

    const provider = createNangoConnectionDisconnectProvider({
      secretKey: "test-secret",
      sdk,
    });

    await expect(provider.disconnectProvider({ provider: "gmail" })).resolves.toEqual({
      kind: "not_found",
    });
    expect(deleteConnection).not.toHaveBeenCalled();
  });

  it("deletes a single connection and verifies post-delete absence", async () => {
    listConnections
      .mockResolvedValueOnce({
        connections: [{ connection_id: "conn-1" }],
      })
      .mockResolvedValueOnce({ connections: [] });
    deleteConnection.mockResolvedValue({});

    const provider = createNangoConnectionDisconnectProvider({
      secretKey: "test-secret",
      sdk,
    });

    await expect(provider.disconnectProvider({ provider: "calendar" })).resolves.toEqual({
      kind: "deleted",
    });
    expect(deleteConnection).toHaveBeenCalledWith("google-calendar", "conn-1");
    expect(listConnections).toHaveBeenCalledTimes(2);
  });

  it("returns ambiguous when multiple connections are found", async () => {
    listConnections.mockResolvedValue({
      connections: [{ connection_id: "conn-1" }, { connection_id: "conn-2" }],
    });

    const provider = createNangoConnectionDisconnectProvider({
      secretKey: "test-secret",
      sdk,
    });

    await expect(provider.disconnectProvider({ provider: "gmail" })).resolves.toEqual({
      kind: "ambiguous",
      connectionCount: 2,
    });
    expect(deleteConnection).not.toHaveBeenCalled();
  });

  it("returns delete_failed when delete throws", async () => {
    listConnections.mockResolvedValue({
      connections: [{ connection_id: "conn-1" }],
    });
    deleteConnection.mockRejectedValue(new Error("forbidden"));

    const provider = createNangoConnectionDisconnectProvider({
      secretKey: "test-secret",
      sdk,
    });

    await expect(provider.disconnectProvider({ provider: "gmail" })).resolves.toEqual({
      kind: "delete_failed",
    });
  });

  it("returns verification_failed when connection remains after delete", async () => {
    listConnections
      .mockResolvedValueOnce({
        connections: [{ connection_id: "conn-1" }],
      })
      .mockResolvedValueOnce({
        connections: [{ connection_id: "conn-1" }],
      });
    deleteConnection.mockResolvedValue({});

    const provider = createNangoConnectionDisconnectProvider({
      secretKey: "test-secret",
      sdk,
    });

    await expect(provider.disconnectProvider({ provider: "gmail" })).resolves.toEqual({
      kind: "verification_failed",
    });
  });
});
