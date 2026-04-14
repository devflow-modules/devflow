import { describe, expect, it } from "vitest";
import {
  EMBEDDED_SIGNUP_OAUTH_SCOPES,
  EMBEDDED_SIGNUP_OAUTH_SCOPE_LIST,
} from "../embeddedSignupOAuthScopes";

describe("embeddedSignupOAuthScopes", () => {
  it("inclui business_management para edges de Business Manager (/me/assigned_whatsapp_business_accounts)", () => {
    expect(EMBEDDED_SIGNUP_OAUTH_SCOPE_LIST).toContain("business_management");
    expect(EMBEDDED_SIGNUP_OAUTH_SCOPES).toContain("business_management");
    expect(EMBEDDED_SIGNUP_OAUTH_SCOPES).toContain("whatsapp_business_management");
    expect(EMBEDDED_SIGNUP_OAUTH_SCOPES).toContain("whatsapp_business_messaging");
  });
});
