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
    expect(billing?.label).toBe("Contrato e uso");
    expect(billing?.aliases.some((a) => a.includes("cobran"))).toBe(true);
  });

  it("ROUTE_META.section segue taxonomia SB-3 (operacao, automacao_ia, conta, equipe, plataforma)", async () => {
    const { ROUTE_META } = await loadNavMatrix();
    expect(ROUTE_META["/dashboard"].section).toBe("operacao");
    expect(ROUTE_META["/inbox"].section).toBe("operacao");
    expect(ROUTE_META["/distribuir"].section).toBe("operacao");
    expect(ROUTE_META["/automation"].section).toBe("automacao_ia");
    expect(ROUTE_META["/dashboard/ai"].section).toBe("automacao_ia");
    expect(ROUTE_META["/settings/ai"].section).toBe("automacao_ia");
    expect(ROUTE_META["/settings"].section).toBe("conta");
    expect(ROUTE_META["/agents"].section).toBe("equipe");
    expect(ROUTE_META["/admin/metrics"].section).toBe("plataforma");
  });

  it("commandPaletteRoutes agrupa por secção alinhada à sidebar", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    const { commandPaletteRoutes, PALETTE_GROUP_ORDER, PALETTE_GROUP_LABEL } = await loadNavMatrix();
    const routes = commandPaletteRoutes("manager");
    const inbox = routes.find((r) => r.href === "/inbox");
    expect(inbox?.groupId).toBe("operacao");
    expect(inbox?.groupLabel).toBe(PALETTE_GROUP_LABEL.operacao);

    const automation = routes.find((r) => r.href === "/automation");
    expect(automation?.groupId).toBe("automacao_ia");

    const settings = routes.find((r) => r.href === "/settings");
    expect(settings?.groupId).toBe("conta");

    const agents = routes.find((r) => r.href === "/agents");
    expect(agents?.groupId).toBe("equipe");

    const groupIds = [...new Set(routes.map((r) => r.groupId))];
    for (const id of groupIds) {
      expect(PALETTE_GROUP_ORDER).toContain(id);
    }
  });
});
