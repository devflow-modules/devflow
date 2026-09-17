import { describe, expect, it } from "vitest";
import { evaluateNangoRequestOrigin, resolveNangoCookieTransport } from "./nango-request-guard";

describe("nango cookie transport", () => {
  it("allows HTTP without Secure only on loopback in development/test", () => {
    expect(
      resolveNangoCookieTransport({
        env: { NODE_ENV: "test" },
        requestUrl: { origin: "http://localhost", protocol: "http:", hostname: "localhost" },
      }),
    ).toEqual({ ok: true, secure: false });
  });

  it("requires Secure HTTPS in hosted preview/production", () => {
    expect(
      resolveNangoCookieTransport({
        env: { VERCEL_ENV: "preview" },
        requestUrl: {
          origin: "https://applyflow.example",
          protocol: "https:",
          hostname: "applyflow.example",
        },
      }),
    ).toEqual({ ok: true, secure: true });
  });

  it("fails closed when hosted runtime is reached over HTTP", () => {
    expect(
      resolveNangoCookieTransport({
        env: { VERCEL_ENV: "production" },
        requestUrl: { origin: "http://localhost", protocol: "http:", hostname: "localhost" },
      }),
    ).toEqual({ ok: false, reason: "insecure_transport" });
  });

  it("fails closed for non-loopback HTTP in development", () => {
    expect(
      resolveNangoCookieTransport({
        env: { NODE_ENV: "development" },
        requestUrl: { origin: "http://192.168.1.10", protocol: "http:", hostname: "192.168.1.10" },
      }),
    ).toEqual({ ok: false, reason: "insecure_transport" });
  });
});

describe("nango request origin", () => {
  const requestOrigin = "http://localhost";

  it("accepts an Origin that matches the server-derived request origin", () => {
    expect(evaluateNangoRequestOrigin({ originHeader: "http://localhost", requestOrigin })).toEqual({
      ok: true,
    });
  });

  it("rejects a foreign Origin", () => {
    expect(
      evaluateNangoRequestOrigin({ originHeader: "https://evil.example", requestOrigin }),
    ).toEqual({ ok: false, reason: "cross_origin_forbidden" });
  });

  it("rejects a missing Origin", () => {
    expect(evaluateNangoRequestOrigin({ originHeader: null, requestOrigin })).toEqual({
      ok: false,
      reason: "missing_request_origin",
    });
  });

  it("rejects the string null Origin", () => {
    expect(evaluateNangoRequestOrigin({ originHeader: "null", requestOrigin })).toEqual({
      ok: false,
      reason: "missing_request_origin",
    });
  });
});
