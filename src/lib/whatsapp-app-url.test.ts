import { describe, it, expect, afterEach } from "vitest";
import { whatsappAppUrl } from "./whatsapp-app-url";

describe("whatsappAppUrl", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("prefixa com o host de NEXT_PUBLIC_WHATSAPP_APP_URL e remove barra final da base", () => {
    process.env.NEXT_PUBLIC_WHATSAPP_APP_URL = "https://wa.example.com/";
    expect(whatsappAppUrl("/inbox")).toBe("https://wa.example.com/inbox");
    expect(whatsappAppUrl("settings")).toBe("https://wa.example.com/settings");
  });

  it("devolve só o path normalizado quando a env está ausente", () => {
    delete process.env.NEXT_PUBLIC_WHATSAPP_APP_URL;
    expect(whatsappAppUrl("/dashboard/billing")).toBe("/dashboard/billing");
    expect(whatsappAppUrl("onboarding")).toBe("/onboarding");
  });
});
