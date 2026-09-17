import { describe, expect, it } from "vitest";
import { evaluateProviderRuntimeFlags } from "@devflow/career-sync";
import { envToProviderRuntimeFlags } from "./nango-connect-session-boundary";
import { NANGO_CALLER_COOKIE_MAX_AGE_SECONDS } from "./nango-caller-session";
import {
  CALLER_NONCE_A,
  enabledNangoTestEnv,
  hostedHttpsNangoTestEnv,
  mintCaller,
  nangoRequest,
} from "./nango-route-test-fixtures";
import { nangoRuntimeNeedsCaller, resolveNangoRouteCaller } from "./nango-route-caller";

const NOW = 1_700_000_000;
const LOCAL_CONNECT = "http://localhost/provider-runtime/nango/connect";
const HOSTED_CONNECT = "https://applyflow.example/provider-runtime/nango/connect";

describe("nango route caller", () => {
  it("does not require a caller when runtime flags are off", () => {
    expect(nangoRuntimeNeedsCaller({})).toBe(false);
    expect(evaluateProviderRuntimeFlags(envToProviderRuntimeFlags({})).canUseNangoRuntime).toBe(false);
    expect(
      resolveNangoRouteCaller({
        request: nangoRequest({ url: LOCAL_CONNECT, origin: "omit" }),
        env: {},
        mintIfMissing: false,
      }),
    ).toEqual({ required: false });
  });

  it("requires a valid cookie when runtime is enabled", () => {
    expect(
      resolveNangoRouteCaller({
        request: nangoRequest({ url: LOCAL_CONNECT }),
        env: enabledNangoTestEnv,
        mintIfMissing: false,
        now: NOW,
      }),
    ).toEqual({
      required: true,
      ok: false,
      reason: "missing_caller_session",
      httpStatus: 401,
    });
  });

  it("accepts a signed caller cookie without minting a replacement", () => {
    const minted = mintCaller(CALLER_NONCE_A, { now: NOW });
    const resolved = resolveNangoRouteCaller({
      request: nangoRequest({ url: LOCAL_CONNECT, cookie: minted.cookieHeader }),
      env: enabledNangoTestEnv,
      mintIfMissing: true,
      now: NOW,
    });
    expect(resolved).toEqual({ required: true, ok: true, callerNonce: CALLER_NONCE_A });
    expect("setCookie" in resolved && resolved.setCookie).toBeFalsy();
  });

  it("mints a new identity when connect sees an expired cookie", () => {
    const minted = mintCaller(CALLER_NONCE_A, { now: NOW });
    const resolved = resolveNangoRouteCaller({
      request: nangoRequest({ url: LOCAL_CONNECT, cookie: minted.cookieHeader }),
      env: enabledNangoTestEnv,
      mintIfMissing: true,
      now: NOW + NANGO_CALLER_COOKIE_MAX_AGE_SECONDS,
    });
    expect(resolved.required).toBe(true);
    if (!resolved.required || !resolved.ok) {
      throw new Error("expected a minted caller");
    }
    expect(resolved.callerNonce).not.toBe(CALLER_NONCE_A);
    expect(resolved.setCookie).toContain("HttpOnly");
    expect(resolved.setCookie).not.toContain("Secure");
  });

  it("rejects an expired cookie on non-connect routes", () => {
    const minted = mintCaller(CALLER_NONCE_A, { now: NOW });
    expect(
      resolveNangoRouteCaller({
        request: nangoRequest({ url: LOCAL_CONNECT, cookie: minted.cookieHeader }),
        env: enabledNangoTestEnv,
        mintIfMissing: false,
        now: NOW + NANGO_CALLER_COOKIE_MAX_AGE_SECONDS,
      }),
    ).toEqual({
      required: true,
      ok: false,
      reason: "missing_caller_session",
      httpStatus: 401,
    });
  });

  it("rejects a foreign Origin before minting", () => {
    expect(
      resolveNangoRouteCaller({
        request: nangoRequest({ url: LOCAL_CONNECT, origin: "https://evil.example" }),
        env: enabledNangoTestEnv,
        mintIfMissing: true,
        now: NOW,
      }),
    ).toEqual({
      required: true,
      ok: false,
      reason: "cross_origin_forbidden",
      httpStatus: 403,
    });
  });

  it("rejects a missing Origin", () => {
    expect(
      resolveNangoRouteCaller({
        request: nangoRequest({ url: LOCAL_CONNECT, origin: "omit" }),
        env: enabledNangoTestEnv,
        mintIfMissing: true,
        now: NOW,
      }),
    ).toEqual({
      required: true,
      ok: false,
      reason: "missing_request_origin",
      httpStatus: 403,
    });
  });

  it("rejects the string null Origin", () => {
    expect(
      resolveNangoRouteCaller({
        request: nangoRequest({ url: LOCAL_CONNECT, origin: null }),
        env: enabledNangoTestEnv,
        mintIfMissing: true,
        now: NOW,
      }),
    ).toEqual({
      required: true,
      ok: false,
      reason: "missing_request_origin",
      httpStatus: 403,
    });
  });

  it("sets Secure when minting on hosted HTTPS", () => {
    const resolved = resolveNangoRouteCaller({
      request: nangoRequest({ url: HOSTED_CONNECT }),
      env: hostedHttpsNangoTestEnv,
      mintIfMissing: true,
      now: NOW,
    });
    expect(resolved.required && resolved.ok).toBe(true);
    if (!resolved.required || !resolved.ok) {
      return;
    }
    expect(resolved.setCookie).toContain("Secure");
  });

  it("fails closed on hosted HTTP instead of minting an insecure cookie", () => {
    expect(
      resolveNangoRouteCaller({
        request: nangoRequest({ url: LOCAL_CONNECT }),
        env: hostedHttpsNangoTestEnv,
        mintIfMissing: true,
        now: NOW,
      }),
    ).toEqual({
      required: true,
      ok: false,
      reason: "insecure_transport",
      httpStatus: 403,
    });
  });
});
