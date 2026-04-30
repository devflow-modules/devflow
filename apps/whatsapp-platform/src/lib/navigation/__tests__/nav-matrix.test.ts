import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

async function loadNavMatrix() {
  return import("../nav-matrix");
}

describe("nav-matrix", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("getBreadcrumbs: settings/ai com home Painel", async () => {
    const { getBreadcrumbs } = await loadNavMatrix();
    const c = getBreadcrumbs("/settings/ai", { href: "/dashboard", label: "Painel" });
    expect(c.map((x) => x.label)).toEqual(["Painel", "Configurações", "Configuração de IA"]);
  });

  it("getBreadcrumbs: dashboard/billing sem duplicar Painel", async () => {
    const { getBreadcrumbs } = await loadNavMatrix();
    const c = getBreadcrumbs("/dashboard/billing", { href: "/dashboard", label: "Painel" });
    expect(c.map((x) => x.href)).toEqual(["/dashboard", "/dashboard/billing"]);
  });

  it("routeAllowedForRole: operador não acede métricas internas", async () => {
    const { routeAllowedForRole } = await loadNavMatrix();
    expect(routeAllowedForRole("/admin/metrics", "operator")).toBe(false);
    expect(routeAllowedForRole("/inbox", "operator")).toBe(true);
    expect(routeAllowedForRole("/agents", "operator")).toBe(false);
    expect(routeAllowedForRole("/settings/developer", "manager")).toBe(false);
    expect(routeAllowedForRole("/settings/developer", "platform_admin")).toBe(true);
  });

  it("navAccessSummary cobre rotas conhecidas", async () => {
    const { navAccessSummary } = await loadNavMatrix();
    const s = navAccessSummary("manager");
    expect(s["/settings"]).toBe(true);
    expect(s["/admin/metrics"]).toBe(false);
  });

  it("commandPaletteRoutes inclui aliases PT para pesquisa", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    const { commandPaletteRoutes } = await loadNavMatrix();
    const routes = commandPaletteRoutes("manager");
    const inbox = routes.find((r) => r.href === "/inbox");
    expect(inbox?.aliases).toContain("mensagens");
    const billing = routes.find((r) => r.href === "/billing");
    expect(billing?.label).toBe("Plano e faturação");
    expect(billing?.aliases.some((a) => a.includes("cobran"))).toBe(true);
  });
});
