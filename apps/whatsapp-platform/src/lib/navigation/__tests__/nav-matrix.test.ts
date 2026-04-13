import { describe, expect, it } from "vitest";
import { commandPaletteRoutes, getBreadcrumbs, navAccessSummary, routeAllowedForRole } from "../nav-matrix";

describe("nav-matrix", () => {
  it("getBreadcrumbs: settings/ai com home Painel", () => {
    const c = getBreadcrumbs("/settings/ai", { href: "/dashboard", label: "Painel" });
    expect(c.map((x) => x.label)).toEqual(["Painel", "Configurações", "IA de atendimento"]);
  });

  it("getBreadcrumbs: dashboard/billing sem duplicar Painel", () => {
    const c = getBreadcrumbs("/dashboard/billing", { href: "/dashboard", label: "Painel" });
    expect(c.map((x) => x.href)).toEqual(["/dashboard", "/dashboard/billing"]);
  });

  it("routeAllowedForRole: operador não acede métricas internas", () => {
    expect(routeAllowedForRole("/admin/metrics", "operator")).toBe(false);
    expect(routeAllowedForRole("/inbox", "operator")).toBe(true);
  });

  it("navAccessSummary cobre rotas conhecidas", () => {
    const s = navAccessSummary("manager");
    expect(s["/settings"]).toBe(true);
    expect(s["/admin/metrics"]).toBe(false);
  });

  it("commandPaletteRoutes inclui aliases PT para pesquisa", () => {
    const routes = commandPaletteRoutes("manager");
    const inbox = routes.find((r) => r.href === "/inbox");
    expect(inbox?.aliases).toContain("mensagens");
    const billing = routes.find((r) => r.href === "/billing");
    expect(billing?.label).toBe("Plano e faturação");
    expect(billing?.aliases.some((a) => a.includes("cobran"))).toBe(true);
  });
});
