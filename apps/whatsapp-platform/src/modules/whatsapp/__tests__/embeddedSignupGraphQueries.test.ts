import { describe, expect, it } from "vitest";
import {
  buildAssignedWhatsappBusinessAccountsUrl,
  EMBEDDED_SIGNUP_ASSIGNED_WABA_FIELDS,
} from "../embeddedSignupGraphQueries";

describe("embeddedSignupGraphQueries", () => {
  it("usa assigned_whatsapp_business_accounts e nunca client_whatsapp_business_accounts", () => {
    const url = buildAssignedWhatsappBusinessAccountsUrl("https://graph.facebook.com/v21.0");
    expect(url).toContain("/me/assigned_whatsapp_business_accounts");
    expect(url).not.toContain("client_whatsapp_business_accounts");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("fields")).toBe(EMBEDDED_SIGNUP_ASSIGNED_WABA_FIELDS);
    expect(parsed.searchParams.get("limit")).toBe("100");
  });
});
