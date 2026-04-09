import { describe, expect, it } from "vitest";
import { resolvePostLoginRedirect } from "../postLoginRedirect";

describe("resolvePostLoginRedirect", () => {
  it("manager+ usa next ou destino padrão do painel", () => {
    expect(resolvePostLoginRedirect("/dashboard", "manager")).toBe("/dashboard");
    expect(resolvePostLoginRedirect(null, "manager")).toBe("/dashboard/whatsapp");
    expect(resolvePostLoginRedirect(null, "platform_admin")).toBe("/dashboard/whatsapp");
  });

  it("operador cai na Inbox ou respeita next seguro (exceto rotas bloqueadas)", () => {
    expect(resolvePostLoginRedirect(null, "operator")).toBe("/inbox");
    expect(resolvePostLoginRedirect("/inbox", "operator")).toBe("/inbox");
    expect(resolvePostLoginRedirect("/dashboard", "operator")).toBe("/inbox");
    expect(resolvePostLoginRedirect("/onboarding", "operator")).toBe("/inbox");
    expect(resolvePostLoginRedirect("/settings", "operator")).toBe("/inbox");
    expect(resolvePostLoginRedirect("/dashboard/whatsapp", "operator")).toBe("/inbox");
  });
});
