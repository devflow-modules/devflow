import { describe, it, expect, afterEach } from "vitest";
import { financeiroAppHref } from "./financeiro-app-href";

describe("financeiroAppHref", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("constrói href absoluto a partir de NEXT_PUBLIC_FINANCEIRO_APP_URL e normaliza o path", () => {
    process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL = "https://fin.example.com";
    expect(financeiroAppHref("dashboard")).toBe("https://fin.example.com/dashboard");
    expect(financeiroAppHref("/dashboard")).toBe("https://fin.example.com/dashboard");
    expect(financeiroAppHref("/ferramentas/financeiro")).toBe(
      "https://fin.example.com/ferramentas/financeiro"
    );
    expect(financeiroAppHref("ferramentas/financeiro")).toBe(
      "https://fin.example.com/ferramentas/financeiro"
    );
  });

  it("mantém path relativo sem env ou quando a base não é uma URL válida", () => {
    delete process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL;
    expect(financeiroAppHref("/relativo")).toBe("/relativo");

    process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL = "::not-a-valid-base::";
    expect(financeiroAppHref("/relativo")).toBe("/relativo");
  });

  it("não deixa protocol-relative escapar para outro host", () => {
    process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL = "https://fin.example.com";
    const href = financeiroAppHref("//evil.com/phish");
    expect(href).not.toMatch(/^https:\/\/evil\.com\//);
    expect(href).toBe("https://fin.example.com/evil.com/phish");
  });

  it("não deixa path com scheme absoluto embutido resolver para host externo", () => {
    process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL = "https://fin.example.com";
    expect(financeiroAppHref("/https://evil.com/phish")).toBe("/https://evil.com/phish");
    expect(financeiroAppHref("https://evil.com/phish")).toBe("/https://evil.com/phish");
    expect(financeiroAppHref("/http://evil.com/phish")).toBe("/http://evil.com/phish");
    expect(financeiroAppHref("http://evil.com/phish")).toBe("/http://evil.com/phish");
  });
});
