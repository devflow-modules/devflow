import { describe, it, expect, afterEach } from "vitest";
import {
  getFinanceiroCutoverRedirectUrl,
  isFinanceiroLandingOrDemoPath,
  isFinanceiroOperationalPath,
} from "@devflow/financeiro-routes";

describe("@devflow/financeiro-routes — cutover e rotas", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("mantém landing e demo no portal e marca dashboard como operacional", () => {
    expect(isFinanceiroLandingOrDemoPath("/ferramentas/financeiro")).toBe(true);
    expect(isFinanceiroLandingOrDemoPath("/ferramentas/financeiro/demo")).toBe(true);
    expect(isFinanceiroOperationalPath("/ferramentas/financeiro")).toBe(false);
    expect(isFinanceiroOperationalPath("/ferramentas/financeiro/dashboard")).toBe(true);
  });

  it("getFinanceiroCutoverRedirectUrl envia rotas operacionais e billing para o app, preserva query e evita loop", () => {
    process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL = "https://fin.example.com";

    const dashboardOnPortal = new URL(
      "https://portal.example.com/ferramentas/financeiro/dashboard?tab=resumo"
    );
    expect(
      getFinanceiroCutoverRedirectUrl({
        nextUrl: dashboardOnPortal,
        url: dashboardOnPortal.toString(),
      })?.href
    ).toBe("https://fin.example.com/ferramentas/financeiro/dashboard?tab=resumo");

    const billingOnPortal = new URL("https://portal.example.com/billing?plan=pro");
    expect(
      getFinanceiroCutoverRedirectUrl({
        nextUrl: billingOnPortal,
        url: billingOnPortal.toString(),
      })?.href
    ).toBe("https://fin.example.com/billing?plan=pro");

    const landing = new URL("https://portal.example.com/ferramentas/financeiro");
    expect(
      getFinanceiroCutoverRedirectUrl({ nextUrl: landing, url: landing.toString() })
    ).toBeNull();

    const alreadyOnApp = new URL(
      "https://fin.example.com/ferramentas/financeiro/dashboard?tab=resumo"
    );
    expect(
      getFinanceiroCutoverRedirectUrl({
        nextUrl: alreadyOnApp,
        url: alreadyOnApp.toString(),
      })
    ).toBeNull();
  });
});
