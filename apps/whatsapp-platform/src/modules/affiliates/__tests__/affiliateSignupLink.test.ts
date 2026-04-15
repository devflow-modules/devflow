import { describe, it, expect, vi } from "vitest";
import { buildAffiliateSignupLink, getWhatsappAppPublicBaseUrl } from "../affiliateSignupLink";

describe("buildAffiliateSignupLink", () => {
  it("monta URL absoluta com base e ref codificado", () => {
    expect(buildAffiliateSignupLink("cjld2cjxh0000qzrmn831ir4", "https://app.example.com")).toBe(
      "https://app.example.com/signup?ref=cjld2cjxh0000qzrmn831ir4"
    );
  });

  it("sem base devolve path relativo", () => {
    expect(buildAffiliateSignupLink("cjld2cjxh0000qzrmn831ir4", "")).toBe(
      "/signup?ref=cjld2cjxh0000qzrmn831ir4"
    );
  });
});

describe("getWhatsappAppPublicBaseUrl", () => {
  it("remove barra final", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_APP_URL", "https://x.com/");
    expect(getWhatsappAppPublicBaseUrl()).toBe("https://x.com");
  });
});
