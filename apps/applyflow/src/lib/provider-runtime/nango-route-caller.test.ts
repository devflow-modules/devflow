import { describe, expect, it } from "vitest";
import { evaluateProviderRuntimeFlags } from "@devflow/career-sync";
import { envToProviderRuntimeFlags } from "./nango-connect-session-boundary";
import { mintNangoCallerSession } from "./nango-caller-session";
import { nangoRuntimeNeedsCaller, resolveNangoRouteCaller } from "./nango-route-caller";

const enabledEnv = {
  CAREER_PROVIDER_RUNTIME_ENABLED: "true",
  NANGO_RUNTIME_ENABLED: "true",
  GMAIL_PROVIDER_ENABLED: "true",
  CALENDAR_PROVIDER_ENABLED: "true",
  NANGO_SECRET_KEY: "nango-secret-test",
};

describe("nango route caller", () => {
  it("does not require a caller when runtime flags are off", () => {
    expect(nangoRuntimeNeedsCaller({})).toBe(false);
    expect(evaluateProviderRuntimeFlags(envToProviderRuntimeFlags({})).canUseNangoRuntime).toBe(false);
    expect(
      resolveNangoRouteCaller({
        request: { headers: { get: () => null } },
        env: {},
        mintIfMissing: false,
      }),
    ).toEqual({ required: false });
  });

  it("requires a valid cookie when runtime is enabled", () => {
    expect(
      resolveNangoRouteCaller({
        request: { headers: { get: () => null } },
        env: enabledEnv,
        mintIfMissing: false,
      }),
    ).toEqual({ required: true, ok: false, reason: "missing_caller_session" });
  });

  it("accepts a signed caller cookie", () => {
    const minted = mintNangoCallerSession("nango-secret-test", { secure: false });
    expect(
      resolveNangoRouteCaller({
        request: { headers: { get: (name) => (name === "cookie" ? minted.cookieHeader : null) } },
        env: enabledEnv,
        mintIfMissing: false,
      }),
    ).toEqual({ required: true, ok: true, callerNonce: minted.nonce });
  });
});
