import { describe, it, expect, afterEach } from "vitest";
import {
  isSafePortalNextPathForWhatsappLogin,
  whatsappAppLoginUrlWithNext,
} from "../portal-whatsapp-login-url";

describe("isSafePortalNextPathForWhatsappLogin", () => {
  it("aceita paths internos típicos do portal e com query", () => {
    expect(isSafePortalNextPathForWhatsappLogin("/admin/leads")).toBe(true);
    expect(isSafePortalNextPathForWhatsappLogin("/admin/lead-finder")).toBe(true);
    expect(isSafePortalNextPathForWhatsappLogin("/inbox?tab=open")).toBe(true);
  });

  it("rejeita URLs absolutas, protocol-relative, encoding malicioso e segmentos com :", () => {
    expect(isSafePortalNextPathForWhatsappLogin("https://evil.com")).toBe(false);
    expect(isSafePortalNextPathForWhatsappLogin("//evil.com")).toBe(false);
    expect(isSafePortalNextPathForWhatsappLogin("/%2F%2Fevil.com")).toBe(false);
    expect(isSafePortalNextPathForWhatsappLogin("/foo\\bar")).toBe(false);
    expect(isSafePortalNextPathForWhatsappLogin("/http://evil.com/x")).toBe(false);
    expect(isSafePortalNextPathForWhatsappLogin("")).toBe(false);
    expect(isSafePortalNextPathForWhatsappLogin("   ")).toBe(false);
    expect(isSafePortalNextPathForWhatsappLogin("/dash ")).toBe(false);
  });
});

describe("whatsappAppLoginUrlWithNext", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("com env, next seguro inclui query codificada; inseguro cai só em /login no host do app", () => {
    process.env.NEXT_PUBLIC_WHATSAPP_APP_URL = "https://wa.example.com";
    expect(whatsappAppLoginUrlWithNext("/admin/leads")).toBe(
      "https://wa.example.com/login?next=" + encodeURIComponent("/admin/leads")
    );
    expect(whatsappAppLoginUrlWithNext("/inbox?tab=open")).toBe(
      "https://wa.example.com/login?next=" + encodeURIComponent("/inbox?tab=open")
    );
    expect(whatsappAppLoginUrlWithNext("//evil.com")).toBe("https://wa.example.com/login");
    expect(whatsappAppLoginUrlWithNext("/%2F%2Fevil.com")).toBe("https://wa.example.com/login");
  });

  it("sem env, devolve paths relativos", () => {
    delete process.env.NEXT_PUBLIC_WHATSAPP_APP_URL;
    expect(whatsappAppLoginUrlWithNext("/admin/leads")).toBe(
      "/login?next=" + encodeURIComponent("/admin/leads")
    );
    expect(whatsappAppLoginUrlWithNext("https://evil.com")).toBe("/login");
  });
});
