import { describe, expect, it } from "vitest";

import {
  acceptExternalGrant,
  extensionAccountStatus,
  extensionOriginsForTarget,
  replaceStoredGrant,
} from "./extension-grant-bridge";

const TOKEN = "a".repeat(64);
const GRANT = {
  accountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  expiresAt: "2026-10-12T12:00:00.000Z",
  token: TOKEN,
  origin: "http://127.0.0.1:3012",
};

describe("extension grant bridge", () => {
  it("keeps local and production origins separate and specific", () => {
    expect(extensionOriginsForTarget("local").every((origin) => origin.startsWith("http://"))).toBe(true);
    expect(extensionOriginsForTarget("production")).toEqual(["https://devflow-applyflow.vercel.app"]);
    expect(extensionOriginsForTarget("production").join(" ")).not.toContain("*");
    expect(extensionOriginsForTarget("local").join(" ")).not.toContain("https://*");
  });

  it("accepts a grant only from an allowed origin and omits the token from status", () => {
    const accepted = acceptExternalGrant({
      message: { type: "APPLYFLOW_BIND_GRANT", ...GRANT },
      senderUrl: "http://127.0.0.1:3012/account",
      allowedOrigins: extensionOriginsForTarget("local"),
      now: Date.parse("2026-10-05T12:00:00.000Z"),
    });
    expect(accepted.ok).toBe(true);
    const status = extensionAccountStatus(accepted.ok ? accepted.grant : null, Date.parse("2026-10-05T12:00:00.000Z"));
    expect(status).toEqual({ signedIn: true, accountId: GRANT.accountId });
    expect(status).not.toHaveProperty("token");
    expect(
      acceptExternalGrant({
        message: { type: "APPLYFLOW_BIND_GRANT", ...GRANT },
        senderUrl: "https://www.linkedin.com/jobs",
        allowedOrigins: extensionOriginsForTarget("local"),
        now: Date.parse("2026-10-05T12:00:00.000Z"),
      }).ok,
    ).toBe(false);
  });

  it("replaces the previous account grant and drops an expired one", () => {
    const next = replaceStoredGrant(GRANT, {
      accountId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      expiresAt: GRANT.expiresAt,
      token: "b".repeat(64),
      origin: GRANT.origin,
    });
    expect(next.accountId).not.toBe(GRANT.accountId);
    expect(next.token).not.toBe(GRANT.token);
    expect(extensionAccountStatus(next, Date.parse("2026-10-13T12:00:00.000Z"))).toEqual({
      signedIn: false,
      accountId: null,
    });
  });
});
