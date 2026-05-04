import { describe, it, expect, afterEach } from "vitest";
import {
  getWhatsappCutoverRedirectUrl,
  isWhatsappPortalOperationalUiPath,
} from "@devflow/whatsapp-routes";

describe("@devflow/whatsapp-routes — cutover", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("isWhatsappPortalOperationalUiPath identifica UI operacional e exclui landings públicas", () => {
    expect(isWhatsappPortalOperationalUiPath("/inbox")).toBe(true);
    expect(isWhatsappPortalOperationalUiPath("/inbox/threads/abc")).toBe(true);
    expect(isWhatsappPortalOperationalUiPath("/settings")).toBe(true);
    expect(isWhatsappPortalOperationalUiPath("/login")).toBe(true);
    expect(isWhatsappPortalOperationalUiPath("/produtos/whatsapp-platform")).toBe(false);
    expect(isWhatsappPortalOperationalUiPath("/automacao-whatsapp")).toBe(false);
    expect(isWhatsappPortalOperationalUiPath("/inbox//")).toBe(true);
  });

  it("getWhatsappCutoverRedirectUrl redirecciona UI operacional para o app e não redirecciona landings", () => {
    process.env.NEXT_PUBLIC_WHATSAPP_APP_URL = "https://whatsapp.example.com/";

    const inboxOnPortal = new URL("https://portal.example.com/inbox?tab=open");
    const redirect = getWhatsappCutoverRedirectUrl(
      { nextUrl: inboxOnPortal, url: inboxOnPortal.toString() },
      undefined
    );
    expect(redirect).not.toBeNull();
    expect(redirect?.href).toBe("https://whatsapp.example.com/inbox?tab=open");

    const landing = new URL("https://portal.example.com/produtos/whatsapp-platform");
    expect(
      getWhatsappCutoverRedirectUrl({ nextUrl: landing, url: landing.toString() }, undefined)
    ).toBeNull();

    delete process.env.NEXT_PUBLIC_WHATSAPP_APP_URL;
    expect(
      getWhatsappCutoverRedirectUrl({ nextUrl: inboxOnPortal, url: inboxOnPortal.toString() }, null)
    ).toBeNull();
  });

  it("getWhatsappCutoverRedirectUrl devolve null quando o pedido já está no host do app (evita loop)", () => {
    process.env.NEXT_PUBLIC_WHATSAPP_APP_URL = "https://whatsapp.example.com";
    const alreadyOnApp = new URL("https://whatsapp.example.com/inbox?tab=open");
    expect(
      getWhatsappCutoverRedirectUrl(
        { nextUrl: alreadyOnApp, url: alreadyOnApp.toString() },
        undefined
      )
    ).toBeNull();
  });
});
