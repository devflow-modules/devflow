import { describe, expect, it } from "vitest";
import {
  NANGO_CALLER_COOKIE_MAX_AGE_SECONDS,
  mintNangoCallerSession,
  parseNangoCallerCookie,
} from "./nango-caller-session";

const SECRET = "nango-secret-test";
const NOW = 1_700_000_000;

describe("nango caller session cookie", () => {
  it("round-trips a minted cookie with signed expiry", () => {
    const minted = mintNangoCallerSession(SECRET, { secure: false, now: NOW });
    expect(minted.nonce).toMatch(/^[a-f0-9]{32}$/);
    expect(minted.expiresAt).toBe(NOW + NANGO_CALLER_COOKIE_MAX_AGE_SECONDS);
    expect(parseNangoCallerCookie(minted.cookieHeader, SECRET, NOW)).toEqual({
      nonce: minted.nonce,
      expiresAt: minted.expiresAt,
    });
    expect(minted.setCookie).toContain("HttpOnly");
    expect(minted.setCookie).toContain("SameSite=Lax");
    expect(minted.setCookie).toContain("Path=/provider-runtime/nango");
    expect(minted.setCookie).toContain(`Max-Age=${NANGO_CALLER_COOKIE_MAX_AGE_SECONDS}`);
    expect(minted.setCookie).not.toContain("Secure");
  });

  it("sets Secure on HTTPS cookies", () => {
    const minted = mintNangoCallerSession(SECRET, { secure: true, now: NOW });
    expect(minted.setCookie).toContain("Secure");
  });

  it("rejects a tampered mac", () => {
    const minted = mintNangoCallerSession(SECRET, { secure: false, now: NOW });
    const tampered = minted.cookieHeader.replace(/[a-f0-9]{8}$/, "ffffffff");
    expect(parseNangoCallerCookie(tampered, SECRET, NOW)).toBeNull();
  });

  it("rejects a cookie signed with a different secret", () => {
    const minted = mintNangoCallerSession(SECRET, { secure: false, now: NOW });
    expect(parseNangoCallerCookie(minted.cookieHeader, "other-secret", NOW)).toBeNull();
  });

  it("rejects the legacy unsigned-expiry format", () => {
    expect(
      parseNangoCallerCookie(
        "af_nango_caller=v1.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        SECRET,
        NOW,
      ),
    ).toBeNull();
  });

  it("rejects an expired cookie even if the browser still sends it", () => {
    const minted = mintNangoCallerSession(SECRET, { secure: false, now: NOW });
    expect(parseNangoCallerCookie(minted.cookieHeader, SECRET, minted.expiresAt)).toBeNull();
    expect(parseNangoCallerCookie(minted.cookieHeader, SECRET, minted.expiresAt + 1)).toBeNull();
    expect(parseNangoCallerCookie(minted.cookieHeader, SECRET, minted.expiresAt - 1)).toEqual({
      nonce: minted.nonce,
      expiresAt: minted.expiresAt,
    });
  });

  it("returns null when the cookie is missing", () => {
    expect(parseNangoCallerCookie(null, SECRET, NOW)).toBeNull();
    expect(parseNangoCallerCookie("other=1", SECRET, NOW)).toBeNull();
  });
});
