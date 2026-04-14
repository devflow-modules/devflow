import { describe, expect, it } from "vitest";
import {
  EMBEDDED_SIGNUP_OAUTH_SCOPES,
  EMBEDDED_SIGNUP_OAUTH_SCOPE_LIST,
} from "../embeddedSignupOAuthScopes";

describe("embeddedSignupOAuthScopes", () => {
  it("usa apenas scopes aceites no dialog Embedded Signup (sem business_management na URL)", () => {
    expect(EMBEDDED_SIGNUP_OAUTH_SCOPE_LIST).toEqual([
      "whatsapp_business_management",
      "whatsapp_business_messaging",
      "public_profile",
    ]);
    expect(EMBEDDED_SIGNUP_OAUTH_SCOPE_LIST).not.toContain("business_management");
    expect(EMBEDDED_SIGNUP_OAUTH_SCOPES).toContain("whatsapp_business_management");
    expect(EMBEDDED_SIGNUP_OAUTH_SCOPES).toContain("whatsapp_business_messaging");
    expect(EMBEDDED_SIGNUP_OAUTH_SCOPES).toContain("public_profile");
  });
});
