import { describe, expect, it } from "vitest";

import {
  buildAuthCallbackUrl,
  DEFAULT_POST_AUTH_PATH,
  isSafeInternalNextPath,
  resolveAuthRedirect,
} from "./safe-redirect";

describe("isSafeInternalNextPath", () => {
  it("accepts internal paths", () => {
    expect(isSafeInternalNextPath("/account")).toBe(true);
    expect(isSafeInternalNextPath("/login?authenticated=true")).toBe(true);
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(isSafeInternalNextPath("https://evil.example")).toBe(false);
    expect(isSafeInternalNextPath("http://evil.example/x")).toBe(false);
    expect(isSafeInternalNextPath("//evil.example")).toBe(false);
  });

  it("rejects scheme-like and unsafe characters", () => {
    expect(isSafeInternalNextPath("/http:foo")).toBe(false);
    expect(isSafeInternalNextPath("/foo\\bar")).toBe(false);
    expect(isSafeInternalNextPath("/x\0y")).toBe(false);
    expect(isSafeInternalNextPath(" /account")).toBe(false);
    expect(isSafeInternalNextPath("account")).toBe(false);
  });
});

describe("resolveAuthRedirect", () => {
  it("returns safe next or fallback", () => {
    expect(resolveAuthRedirect("/account")).toBe("/account");
    expect(resolveAuthRedirect("//evil.example")).toBe(DEFAULT_POST_AUTH_PATH);
    expect(resolveAuthRedirect(null, "/login?authenticated=true")).toBe(
      "/login?authenticated=true",
    );
  });
});

describe("buildAuthCallbackUrl", () => {
  it("builds an internal callback URL with safe next", () => {
    expect(buildAuthCallbackUrl("http://localhost:3010", "/account")).toBe(
      "http://localhost:3010/auth/callback?next=%2Faccount",
    );
  });

  it("falls back when next is unsafe", () => {
    expect(buildAuthCallbackUrl("http://localhost:3010", "//evil.example")).toBe(
      "http://localhost:3010/auth/callback?next=%2Faccount",
    );
  });
});
