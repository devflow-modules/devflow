import { describe, expect, it } from "vitest";
import {
  createProviderRuntimeConnectionStatus,
  createProviderRuntimeConnectionStatusFromConnectEvent,
  isProviderRuntimeConnectionStatusSafeForClient,
  mapProviderRuntimeConnectEventToState,
} from "../src/provider-connection/runtime-status.js";

const updatedAt = "2026-06-12T12:00:00.000Z";

describe("createProviderRuntimeConnectionStatus", () => {
  it("creates not_connected status client-safe", () => {
    const status = createProviderRuntimeConnectionStatus({
      provider: "gmail",
      runtime: "nango",
      state: "not_connected",
      updatedAt,
    });

    expect(status.state).toBe("not_connected");
    expect(status.safeForClient).toBe(true);
    expect(status.provider).toBe("gmail");
    expect(status.runtime).toBe("nango");
  });

  it("creates connecting status client-safe", () => {
    const status = createProviderRuntimeConnectionStatus({
      provider: "calendar",
      runtime: "nango",
      state: "connecting",
      updatedAt,
    });

    expect(status.state).toBe("connecting");
    expect(isProviderRuntimeConnectionStatusSafeForClient(status)).toBe(true);
  });

  it("creates connected status client-safe", () => {
    const status = createProviderRuntimeConnectionStatus({
      provider: "gmail",
      runtime: "nango",
      state: "connected",
      updatedAt,
    });

    expect(status.state).toBe("connected");
    expect(status.messages.join(" ")).toMatch(/No Gmail or Calendar data has been imported yet/i);
  });

  it("creates error status client-safe", () => {
    const status = createProviderRuntimeConnectionStatus({
      provider: "gmail",
      runtime: "nango",
      state: "error",
      updatedAt,
    });

    expect(status.state).toBe("error");
    expect(status.messages.join(" ")).toMatch(/No provider data was imported or stored/i);
  });

  it("creates revoked status client-safe", () => {
    const status = createProviderRuntimeConnectionStatus({
      provider: "calendar",
      runtime: "nango",
      state: "revoked",
      updatedAt,
    });

    expect(status.state).toBe("revoked");
  });

  it("always keeps sync/import/payload/token flags disabled", () => {
    const status = createProviderRuntimeConnectionStatus({
      provider: "gmail",
      runtime: "nango",
      state: "connected",
      updatedAt,
    });

    expect(status.canSync).toBe(false);
    expect(status.canImportProviderData).toBe(false);
    expect(status.canPersistProviderPayload).toBe(false);
    expect(status.hasToken).toBe(false);
    expect(status.safeForClient).toBe(true);
  });
});

describe("mapProviderRuntimeConnectEventToState", () => {
  it("maps connect UI events to runtime states", () => {
    expect(mapProviderRuntimeConnectEventToState("idle")).toBe("not_connected");
    expect(mapProviderRuntimeConnectEventToState("connect_start")).toBe("connecting");
    expect(mapProviderRuntimeConnectEventToState("connect_success")).toBe("connected");
    expect(mapProviderRuntimeConnectEventToState("connect_error")).toBe("error");
    expect(mapProviderRuntimeConnectEventToState("connect_close")).toBe("not_connected");
    expect(mapProviderRuntimeConnectEventToState("revoke")).toBe("revoked");
  });
});

describe("createProviderRuntimeConnectionStatusFromConnectEvent", () => {
  it("creates status from connect success event", () => {
    const status = createProviderRuntimeConnectionStatusFromConnectEvent({
      provider: "gmail",
      event: "connect_success",
      updatedAt,
    });

    expect(status.state).toBe("connected");
  });
});

describe("provider runtime connection status safety", () => {
  it("serialized status does not contain secrets, tokens, or provider payloads", () => {
    const status = createProviderRuntimeConnectionStatus({
      provider: "gmail",
      runtime: "nango",
      state: "connected",
      updatedAt,
    });
    const content = [...status.messages, ...status.warnings].join(" ");

    expect(content).not.toMatch(/access_token/i);
    expect(content).not.toMatch(/refresh_token/i);
    expect(content).not.toMatch(/client_secret/i);
    expect(content).not.toMatch(/providerPayload/i);
    expect(content).not.toMatch(/raw email body/i);
    expect(content).not.toMatch(/raw calendar description/i);
    expect(content).not.toMatch(/meetingLink/i);
    expect(isProviderRuntimeConnectionStatusSafeForClient(status)).toBe(true);
  });
});
