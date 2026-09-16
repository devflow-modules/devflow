import { describe, expect, it } from "vitest";
import { mintNangoCallerSession, parseNangoCallerCookie } from "./nango-caller-session";

const SECRET = "nango-secret-test";

describe("nango caller session cookie", () => {
  it("round-trips a minted cookie", () => {
    const minted = mintNangoCallerSession(SECRET, { secure: false });
    expect(minted.nonce).toMatch(/^[a-f0-9]{32}$/);
    expect(parseNangoCallerCookie(minted.cookieHeader, SECRET)).toEqual({ nonce: minted.nonce });
    expect(minted.setCookie).toContain("HttpOnly");
    expect(minted.setCookie).toContain("Path=/provider-runtime/nango");
    expect(minted.setCookie).not.toContain("Secure");
  });

  it("sets Secure on HTTPS cookies", () => {
    const minted = mintNangoCallerSession(SECRET, { secure: true });
    expect(minted.setCookie).toContain("Secure");
  });

  it("rejects a tampered mac", () => {
    const minted = mintNangoCallerSession(SECRET, { secure: false });
    const tampered = minted.cookieHeader.replace(/[a-f0-9]{8}$/, "ffffffff");
    expect(parseNangoCallerCookie(tampered, SECRET)).toBeNull();
  });

  it("rejects a cookie signed with a different secret", () => {
    const minted = mintNangoCallerSession(SECRET, { secure: false });
    expect(parseNangoCallerCookie(minted.cookieHeader, "other-secret")).toBeNull();
  });

  it("returns null when the cookie is missing", () => {
    expect(parseNangoCallerCookie(null, SECRET)).toBeNull();
    expect(parseNangoCallerCookie("other=1", SECRET)).toBeNull();
  });
});
