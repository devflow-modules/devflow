import { describe, expect, it } from "vitest";
import {
  evaluateNangoRequestOrigin,
  resolveAllowedNangoOrigins,
  resolveNangoCookieTransport,
} from "./nango-request-guard";

describe("nango allowed origins", () => {
  it("uses predicted loopback origins in test when no public URL is configured", () => {
    const resolved = resolveAllowedNangoOrigins({ NODE_ENV: "test" });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) {
      return;
    }
    expect(resolved.origins).toContain("http://localhost");
    expect(resolved.origins).toContain("http://localhost:3010");
    expect(resolved.origins.some((origin) => origin.endsWith("vercel.app"))).toBe(false);
  });

  it("uses NEXT_PUBLIC_APPLYFLOW_URL as the only development origin when set", () => {
    expect(
      resolveAllowedNangoOrigins({
        NODE_ENV: "development",
        NEXT_PUBLIC_APPLYFLOW_URL: "http://localhost:3011",
      }),
    ).toEqual({ ok: true, origins: ["http://localhost:3011"] });
  });

  it("allows the current Vercel deployment host and an explicit public URL", () => {
    const resolved = resolveAllowedNangoOrigins({
      VERCEL_ENV: "preview",
      NEXT_PUBLIC_APPLYFLOW_URL: "https://applyflow.example",
      VERCEL_URL: "devflow-applyflow-git-publish.vercel.app",
    });
    expect(resolved).toEqual({
      ok: true,
      origins: ["https://applyflow.example", "https://devflow-applyflow-git-publish.vercel.app"],
    });
  });

  it("fails closed in hosted environments without a configured origin", () => {
    expect(resolveAllowedNangoOrigins({ VERCEL_ENV: "preview" })).toEqual({
      ok: false,
      reason: "missing_allowed_origin",
    });
  });

  it("fails closed on an invalid or HTTP hosted public URL", () => {
    expect(
      resolveAllowedNangoOrigins({
        VERCEL_ENV: "production",
        NEXT_PUBLIC_APPLYFLOW_URL: "http://applyflow.example",
      }),
    ).toEqual({ ok: false, reason: "missing_allowed_origin" });
    expect(
      resolveAllowedNangoOrigins({
        VERCEL_ENV: "preview",
        NEXT_PUBLIC_APPLYFLOW_URL: "https://*.vercel.app",
      }),
    ).toEqual({ ok: false, reason: "missing_allowed_origin" });
    expect(
      resolveAllowedNangoOrigins({
        VERCEL_ENV: "preview",
        VERCEL_URL: "*.vercel.app",
      }),
    ).toEqual({ ok: false, reason: "missing_allowed_origin" });
  });
});

describe("nango cookie transport", () => {
  it("sets Secure for https origins", () => {
    expect(resolveNangoCookieTransport({ origin: "https://applyflow.example" })).toEqual({
      ok: true,
      secure: true,
    });
  });

  it("allows HTTP without Secure only on loopback", () => {
    expect(resolveNangoCookieTransport({ origin: "http://localhost:3010" })).toEqual({
      ok: true,
      secure: false,
    });
  });

  it("rejects non-loopback HTTP", () => {
    expect(resolveNangoCookieTransport({ origin: "http://192.168.1.10" })).toEqual({
      ok: false,
      reason: "insecure_transport",
    });
  });
});

describe("nango request origin", () => {
  const allowedOrigins = ["http://localhost", "https://applyflow.example"];

  it("accepts an Origin on the server-side allowlist", () => {
    expect(evaluateNangoRequestOrigin({ originHeader: "http://localhost", allowedOrigins })).toEqual({
      ok: true,
      origin: "http://localhost",
    });
  });

  it("rejects a foreign Origin even when it matches a spoofed request URL", () => {
    expect(
      evaluateNangoRequestOrigin({
        originHeader: "https://evil.example",
        allowedOrigins,
      }),
    ).toEqual({ ok: false, reason: "cross_origin_forbidden" });
  });

  it("rejects a missing Origin", () => {
    expect(evaluateNangoRequestOrigin({ originHeader: null, allowedOrigins })).toEqual({
      ok: false,
      reason: "missing_request_origin",
    });
  });

  it("rejects the string null Origin", () => {
    expect(evaluateNangoRequestOrigin({ originHeader: "null", allowedOrigins })).toEqual({
      ok: false,
      reason: "missing_request_origin",
    });
  });

  it("rejects an invalid Origin value", () => {
    expect(evaluateNangoRequestOrigin({ originHeader: "not-a-url", allowedOrigins })).toEqual({
      ok: false,
      reason: "missing_request_origin",
    });
  });
});
