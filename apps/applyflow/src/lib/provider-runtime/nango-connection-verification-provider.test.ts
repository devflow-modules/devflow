import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNangoConnectionVerificationProvider } from "./nango-connection-verification-provider.js";

const listConnections = vi.fn();

vi.mock("@nangohq/node", () => ({
  Nango: vi.fn(function MockNango() {
    return {
      listConnections,
    };
  }),
}));

describe("createNangoConnectionVerificationProvider", () => {
  beforeEach(() => {
    listConnections.mockReset();
  });

  it("returns connected when a connection exists without auth errors", async () => {
    listConnections.mockResolvedValue({
      connections: [{ errors: [] }],
    });

    const provider = createNangoConnectionVerificationProvider({ secretKey: "test-secret" });
    const result = await provider.verifyConnection({ provider: "gmail" });

    expect(result).toEqual({ exists: true, state: "connected" });
    expect(listConnections).toHaveBeenCalledWith({
      integrationId: "google-mail",
      tags: { end_user_id: "applyflow-gmail-runtime-boundary" },
      limit: 10,
    });
  });

  it("returns not_connected when no connection exists", async () => {
    listConnections.mockResolvedValue({ connections: [] });

    const provider = createNangoConnectionVerificationProvider({ secretKey: "test-secret" });
    const result = await provider.verifyConnection({ provider: "calendar" });

    expect(result).toEqual({ exists: false, state: "not_connected" });
    expect(listConnections).toHaveBeenCalledWith({
      integrationId: "google-calendar",
      tags: { end_user_id: "applyflow-calendar-runtime-boundary" },
      limit: 10,
    });
  });

  it("returns error when connection has auth errors", async () => {
    listConnections.mockResolvedValue({
      connections: [{ errors: [{ type: "auth" }] }],
    });

    const provider = createNangoConnectionVerificationProvider({ secretKey: "test-secret" });
    const result = await provider.verifyConnection({ provider: "gmail" });

    expect(result).toEqual({ exists: false, state: "error" });
  });

  it("returns error when SDK throws", async () => {
    listConnections.mockRejectedValue(new Error("sdk failure"));

    const provider = createNangoConnectionVerificationProvider({ secretKey: "test-secret" });
    const result = await provider.verifyConnection({ provider: "gmail" });

    expect(result).toEqual({ exists: false, state: "error" });
  });
});
