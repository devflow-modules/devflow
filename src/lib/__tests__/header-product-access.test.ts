import { afterEach, describe, expect, it } from "vitest";
import { FINANCEIRO_AUTH_PATH } from "@devflow/financeiro-routes";
import {
  ACCESS_PRODUCTS_LABEL,
  getHeaderProductAccessTargets,
} from "../header-product-access";

describe("header-product-access", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("expõe label estável e dois destinos WA + Financeiro", () => {
    delete process.env.NEXT_PUBLIC_WHATSAPP_APP_URL;
    delete process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL;

    expect(ACCESS_PRODUCTS_LABEL).toBe("Acessar produtos");
    const targets = getHeaderProductAccessTargets();
    expect(targets.map((t) => t.id)).toEqual(["whatsapp", "financeiro"]);
    expect(targets[0]).toMatchObject({
      label: "WhatsApp Platform",
      href: "/login",
      cta: "acessar_whatsapp",
    });
    expect(targets[1]).toMatchObject({
      label: "Financeiro",
      href: FINANCEIRO_AUTH_PATH,
      cta: "acessar_financeiro",
    });
    expect(targets[1].href).toBe("/ferramentas/financeiro/auth");
  });

  it("usa hosts canónicos quando as envs de cutover estão definidas", () => {
    process.env.NEXT_PUBLIC_WHATSAPP_APP_URL = "https://wa.example.com";
    process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL = "https://fin.example.com";

    const targets = getHeaderProductAccessTargets();
    expect(targets[0].href).toBe("https://wa.example.com/login");
    expect(targets[1].href).toBe("https://fin.example.com/ferramentas/financeiro/auth");
  });
});
