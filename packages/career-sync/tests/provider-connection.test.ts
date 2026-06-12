import { describe, expect, it } from "vitest";
import {
  canDeleteProviderDerivedData,
  canProviderSync,
  canRevokeProviderConnection,
  collectProviderConnectionWarnings,
  createProviderConnectionCapability,
  createProviderConnectionSnapshot,
  isProviderConnected,
  summarizeProviderConnections,
} from "../src/provider-connection/status.js";
import type { ProviderConnectionSnapshot } from "../src/provider-connection/types.js";

const FORBIDDEN_SNAPSHOT_KEYS = [
  "access_token",
  "refresh_token",
  "client_secret",
  "providerPayload",
  "raw",
  "body",
  "description",
  "hangoutLink",
  "meetingLink",
] as const;

function collectObjectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (value === null || typeof value !== "object") {
    return keys;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectObjectKeys(item, keys);
    }
    return keys;
  }
  for (const [key, nested] of Object.entries(value)) {
    keys.add(key);
    collectObjectKeys(nested, keys);
  }
  return keys;
}

const gmailConnected = createProviderConnectionSnapshot({
  provider: "gmail",
  runtime: "sandbox",
  status: "connected",
  accountHint: "demo-account",
  scopes: ["gmail.metadata.read"],
  connectedAt: "2026-06-12T10:00:00.000Z",
  lastSyncAt: "2026-06-12T10:10:00.000Z",
  capability: {
    canSync: true,
    canRevoke: true,
    canDeleteDerivedData: true,
  },
});

const calendarNotConnected = createProviderConnectionSnapshot({
  provider: "calendar",
  runtime: "sandbox",
  status: "not_connected",
  scopes: [],
});

describe("createProviderConnectionCapability", () => {
  it("creates safe defaults", () => {
    expect(createProviderConnectionCapability()).toEqual({
      canSync: false,
      canRevoke: false,
      canDeleteDerivedData: false,
      userReviewRequired: true,
    });
  });

  it("always forces userReviewRequired true", () => {
    const capability = createProviderConnectionCapability({ canSync: true });
    expect(capability.userReviewRequired).toBe(true);
  });
});

describe("createProviderConnectionSnapshot", () => {
  it("sorts scopes deterministically", () => {
    const snapshot = createProviderConnectionSnapshot({
      provider: "gmail",
      runtime: "sandbox",
      status: "connected",
      scopes: ["z-scope", "a-scope", "m-scope"],
      connectedAt: "2026-06-12T10:00:00.000Z",
    });
    expect(snapshot.scopes).toEqual(["a-scope", "m-scope", "z-scope"]);
  });

  it("does not mutate input scopes", () => {
    const scopes = ["z-scope", "a-scope"];
    const before = [...scopes];
    createProviderConnectionSnapshot({
      provider: "gmail",
      runtime: "sandbox",
      status: "not_connected",
      scopes,
    });
    expect(scopes).toEqual(before);
  });
});

describe("isProviderConnected", () => {
  it("returns true for connected and sync_available", () => {
    expect(isProviderConnected(gmailConnected)).toBe(true);
    expect(
      isProviderConnected(
        createProviderConnectionSnapshot({
          provider: "calendar",
          runtime: "sandbox",
          status: "sync_available",
          scopes: ["calendar.read"],
          connectedAt: "2026-06-12T10:00:00.000Z",
        }),
      ),
    ).toBe(true);
  });

  it("returns false for not_connected, revoked, expired, error, sync_disabled", () => {
    const statuses = ["not_connected", "revoked", "expired", "error", "sync_disabled"] as const;
    for (const status of statuses) {
      const snapshot = createProviderConnectionSnapshot({
        provider: "gmail",
        runtime: "sandbox",
        status,
        scopes: [],
        ...(status === "revoked" ? { revokedAt: "2026-06-12T11:00:00.000Z" } : {}),
      });
      expect(isProviderConnected(snapshot)).toBe(false);
    }
  });
});

describe("canProviderSync", () => {
  it("returns true only when status allows sync and capability permits", () => {
    expect(canProviderSync(gmailConnected)).toBe(true);
  });

  it("returns false when capability.canSync is false", () => {
    const snapshot = createProviderConnectionSnapshot({
      ...gmailConnected,
      capability: { canSync: false, canRevoke: true, canDeleteDerivedData: true },
    });
    expect(canProviderSync(snapshot)).toBe(false);
  });

  it("returns false when status does not allow sync", () => {
    expect(canProviderSync(calendarNotConnected)).toBe(false);
    expect(
      canProviderSync(
        createProviderConnectionSnapshot({
          provider: "gmail",
          runtime: "sandbox",
          status: "revoked",
          scopes: [],
          revokedAt: "2026-06-12T11:00:00.000Z",
          capability: { canSync: true, canRevoke: false, canDeleteDerivedData: true },
        }),
      ),
    ).toBe(false);
  });
});

describe("canRevokeProviderConnection", () => {
  it("returns true when status is revocable and capability permits", () => {
    expect(canRevokeProviderConnection(gmailConnected)).toBe(true);
  });

  it("returns false for not_connected or revoked", () => {
    expect(canRevokeProviderConnection(calendarNotConnected)).toBe(false);
    expect(
      canRevokeProviderConnection(
        createProviderConnectionSnapshot({
          provider: "gmail",
          runtime: "sandbox",
          status: "revoked",
          scopes: [],
          revokedAt: "2026-06-12T11:00:00.000Z",
          capability: { canSync: false, canRevoke: true, canDeleteDerivedData: true },
        }),
      ),
    ).toBe(false);
  });
});

describe("canDeleteProviderDerivedData", () => {
  it("allows delete when capability permits, including after revoked", () => {
    const revoked = createProviderConnectionSnapshot({
      provider: "gmail",
      runtime: "sandbox",
      status: "revoked",
      scopes: [],
      revokedAt: "2026-06-12T11:00:00.000Z",
      capability: {
        canSync: false,
        canRevoke: false,
        canDeleteDerivedData: true,
      },
    });
    expect(canDeleteProviderDerivedData(revoked)).toBe(true);
    expect(canDeleteProviderDerivedData(calendarNotConnected)).toBe(false);
  });
});

describe("summarizeProviderConnections", () => {
  it("counts all connection states", () => {
    const snapshots: ProviderConnectionSnapshot[] = [
      gmailConnected,
      calendarNotConnected,
      createProviderConnectionSnapshot({
        provider: "gmail",
        runtime: "sandbox",
        status: "expired",
        scopes: [],
        connectedAt: "2026-06-01T10:00:00.000Z",
      }),
      createProviderConnectionSnapshot({
        provider: "calendar",
        runtime: "sandbox",
        status: "revoked",
        scopes: [],
        revokedAt: "2026-06-02T10:00:00.000Z",
      }),
      createProviderConnectionSnapshot({
        provider: "gmail",
        runtime: "sandbox",
        status: "error",
        scopes: [],
        errorCode: "sandbox-error",
      }),
      createProviderConnectionSnapshot({
        provider: "calendar",
        runtime: "sandbox",
        status: "sync_available",
        scopes: ["calendar.read"],
        connectedAt: "2026-06-03T10:00:00.000Z",
      }),
      createProviderConnectionSnapshot({
        provider: "gmail",
        runtime: "sandbox",
        status: "sync_disabled",
        scopes: [],
        connectedAt: "2026-06-04T10:00:00.000Z",
      }),
    ];

    expect(summarizeProviderConnections(snapshots)).toEqual({
      total: 7,
      connected: 1,
      notConnected: 1,
      expired: 1,
      revoked: 1,
      error: 1,
      syncAvailable: 1,
      syncDisabled: 1,
    });
  });
});

describe("collectProviderConnectionWarnings", () => {
  it("warns when connected without connectedAt", () => {
    const warnings = collectProviderConnectionWarnings(
      createProviderConnectionSnapshot({
        provider: "gmail",
        runtime: "sandbox",
        status: "connected",
        scopes: ["gmail.metadata.read"],
      }),
    );
    expect(warnings).toContain("connected status requires connectedAt");
  });

  it("warns when revoked without revokedAt", () => {
    const warnings = collectProviderConnectionWarnings(
      createProviderConnectionSnapshot({
        provider: "gmail",
        runtime: "sandbox",
        status: "revoked",
        scopes: [],
      }),
    );
    expect(warnings).toContain("revoked status requires revokedAt");
  });

  it("warns when error without errorCode or errorMessage", () => {
    const warnings = collectProviderConnectionWarnings(
      createProviderConnectionSnapshot({
        provider: "calendar",
        runtime: "sandbox",
        status: "error",
        scopes: [],
      }),
    );
    expect(warnings).toContain("error status requires errorCode or errorMessage");
  });

  it("warns when canSync is true but status invalid", () => {
    const warnings = collectProviderConnectionWarnings(
      createProviderConnectionSnapshot({
        provider: "gmail",
        runtime: "sandbox",
        status: "not_connected",
        scopes: [],
        capability: { canSync: true, canRevoke: false, canDeleteDerivedData: false },
      }),
    );
    expect(warnings).toContain("canSync is true but status does not allow sync");
  });

  it("warns when connected without scopes", () => {
    const warnings = collectProviderConnectionWarnings(
      createProviderConnectionSnapshot({
        provider: "gmail",
        runtime: "sandbox",
        status: "connected",
        scopes: [],
        connectedAt: "2026-06-12T10:00:00.000Z",
      }),
    );
    expect(warnings).toContain("connected status should declare scopes");
  });
});

describe("provider connection snapshot safety", () => {
  it("snapshot JSON excludes tokens and provider payloads", () => {
    const json = JSON.stringify(gmailConnected);
    const keys = collectObjectKeys(JSON.parse(json));
    for (const forbidden of FORBIDDEN_SNAPSHOT_KEYS) {
      expect(keys.has(forbidden)).toBe(false);
    }
    expect(json).not.toMatch(/access_token/);
    expect(json).not.toMatch(/refresh_token/);
    expect(json).not.toMatch(/providerPayload/);
  });

  it("fake Gmail connected fixture is valid", () => {
    expect(gmailConnected.provider).toBe("gmail");
    expect(gmailConnected.status).toBe("connected");
    expect(gmailConnected.accountHint).toBe("demo-account");
    expect(isProviderConnected(gmailConnected)).toBe(true);
    expect(canProviderSync(gmailConnected)).toBe(true);
    expect(collectProviderConnectionWarnings(gmailConnected)).toEqual([]);
  });

  it("fake Calendar not_connected fixture is valid", () => {
    expect(calendarNotConnected.provider).toBe("calendar");
    expect(calendarNotConnected.status).toBe("not_connected");
    expect(isProviderConnected(calendarNotConnected)).toBe(false);
    expect(canProviderSync(calendarNotConnected)).toBe(false);
  });

  it("fake revoked fixture allows delete derived data", () => {
    const revoked = createProviderConnectionSnapshot({
      provider: "gmail",
      runtime: "sandbox",
      status: "revoked",
      scopes: [],
      revokedAt: "2026-06-12T11:00:00.000Z",
      capability: {
        canSync: false,
        canRevoke: false,
        canDeleteDerivedData: true,
      },
    });
    expect(canDeleteProviderDerivedData(revoked)).toBe(true);
    expect(canRevokeProviderConnection(revoked)).toBe(false);
    expect(collectProviderConnectionWarnings(revoked)).toEqual([]);
  });
});
