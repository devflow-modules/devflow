import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const moduleDir = dirname(fileURLToPath(import.meta.url));

describe("Embedded Signup — origem do token (onboarding vs operacional)", () => {
  beforeEach(() => {
    process.env.META_APP_ID = "111111111111111";
    process.env.META_APP_SECRET = "test_secret_not_used_in_mock";
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = "config_id_test";
    process.env.WHATSAPP_OAUTH_REDIRECT_URI = "http://localhost:3000/dashboard/whatsapp/callback";
    process.env.META_API_VERSION = "v21.0";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.META_WHATSAPP_ACCESS_TOKEN;
  });

  it("onboarding: segunda chamada fetch usa Bearer = token da resposta OAuth, não env", async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "SYSTEM_USER_TOKEN_MUST_NOT_BE_USED";
    process.env.META_WHATSAPP_ACCESS_TOKEN = "ALT_SYS";

    const fetchMock = vi.fn().mockImplementation((url: string | URL) => {
      const u = typeof url === "string" ? url : url.toString();
      if (u.includes("/oauth/access_token")) {
        return Promise.resolve(
          new Response(JSON.stringify({ access_token: "EAAG_OAUTH_USER_FROM_CODE" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      if (u.includes("/debug_token")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                app_id: "111111111111111",
                type: "USER",
                is_valid: true,
                scopes: ["whatsapp_business_management", "public_profile"],
                user_id: "42",
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      }
      if (u.includes("assigned_whatsapp_business_accounts")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "waba_1",
                  business_id: "biz_1",
                  phone_numbers: {
                    data: [{ id: "phone_1", display_phone_number: "+5511999999999" }],
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      }
      return Promise.resolve(new Response(`unexpected url: ${u}`, { status: 404 }));
    });

    vi.stubGlobal("fetch", fetchMock);

    const { exchangeCodeAndFetchPhoneNumbers } = await import("../embeddedSignupService");
    const rows = await exchangeCodeAndFetchPhoneNumbers("dummy_authorization_code");

    expect(fetchMock).toHaveBeenCalledTimes(3);

    const wabaCall = fetchMock.mock.calls.find((c) => String(c[0]).includes("assigned_whatsapp_business_accounts"));
    expect(wabaCall).toBeDefined();
    const auth = (wabaCall![1] as { headers?: { Authorization?: string } })?.headers?.Authorization;
    expect(auth).toBe("Bearer EAAG_OAUTH_USER_FROM_CODE");
    expect(rows).toHaveLength(1);
    expect(rows[0].accessToken).toBe("EAAG_OAUTH_USER_FROM_CODE");
    expect(rows[0].phoneNumberId).toBe("phone_1");
  });

  it("módulos de onboarding não importam operationalWhatsappAccessToken", () => {
    const base = join(moduleDir, "..");
    for (const name of [
      "embeddedSignupOAuthExchange.ts",
      "embeddedSignupWabaFetch.ts",
      "embeddedSignupService.ts",
      "embeddedSignupMetaEnv.ts",
      "embeddedSignupLogRedact.ts",
      "embeddedSignupUserAccessToken.ts",
    ]) {
      const src = readFileSync(join(base, name), "utf8");
      expect(src).not.toMatch(/from\s+["'].*operationalWhatsappAccessToken["']/);
    }
  });
});
