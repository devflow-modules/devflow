import { describe, expect, it, vi } from "vitest";
import {
  navAccountItemsForRole,
  navAutomationItemsForRole,
  navOperationItemsForRole,
  navPlatformItemsForRole,
  navTeamItemsForRole,
  primaryNavForRole,
  secondaryNavForRole,
} from "../nav-config";
import { ROUTE_META } from "@/lib/navigation/nav-matrix";

describe("nav-config (produto por role)", () => {
  it("role null: fail-closed — só mínimo de operator, sem dashboard/billing/settings/equipe", () => {
    expect(primaryNavForRole(null).map((i) => i.href)).toEqual([
      "/inbox",
      "/conversations",
      "/automation",
    ]);
    expect(navOperationItemsForRole(null).map((i) => i.href)).toEqual([
      "/inbox",
      "/conversations",
      "/queues",
    ]);
    expect(navAutomationItemsForRole(null).map((i) => i.href)).toEqual(["/automation"]);
    expect(navAccountItemsForRole(null)).toEqual([]);
    expect(navTeamItemsForRole(null)).toEqual([]);
    expect(secondaryNavForRole(null)).toEqual([]);
  });

  it("operador: compat NAV_PRIMARY = Inbox + Histórico + Automações; sem secundária", () => {
    const primary = primaryNavForRole("operator");
    expect(primary.map((i) => i.href)).toEqual(["/inbox", "/conversations", "/automation"]);
    expect(secondaryNavForRole("operator")).toEqual([]);
  });

  it("operador: sidebar — Operação (sem painel), Automação só regras, sem Conta e sem Equipe", () => {
    expect(navOperationItemsForRole("operator").map((i) => i.href)).toEqual([
      "/inbox",
      "/conversations",
      "/queues",
    ]);
    expect(navAutomationItemsForRole("operator").map((i) => i.href)).toEqual(["/automation"]);
    expect(navAccountItemsForRole("operator")).toEqual([]);
    expect(navTeamItemsForRole("operator")).toEqual([]);
  });

  it("admin (manager): painel completo na principal + secundária com billing e configurações (SAAS)", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    vi.resetModules();
    const {
      primaryNavForRole: primaryNavSaas,
      secondaryNavForRole: secondaryNavSaas,
    } = await import("../nav-config");
    const primary = primaryNavSaas("manager");
    expect(primary.map((i) => i.href)).toContain("/dashboard");
    expect(primary.map((i) => i.href)).toContain("/inbox");
    expect(primary.map((i) => i.href)).toContain("/automation");

    const secondary = secondaryNavSaas("manager");
    expect(secondary.some((i) => i.href === "/billing")).toBe(true);
    expect(secondary.some((i) => i.href === "/settings")).toBe(true);
    expect(secondary.some((i) => i.href === "/settings/developer")).toBe(false);
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("manager em WHITE_LABEL: secundária sem /billing", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "WHITE_LABEL");
    vi.resetModules();
    const { secondaryNavForRole: secondaryNavWl } = await import("../nav-config");
    const secondary = secondaryNavWl("manager");
    expect(secondary.some((i) => i.href === "/billing")).toBe(false);
    expect(secondary.some((i) => i.href === "/settings")).toBe(true);
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("SB-8: platformNav fail-closed — só platform_admin; null/operator/manager → []", () => {
    expect(navPlatformItemsForRole(null)).toEqual([]);
    expect(navPlatformItemsForRole("operator")).toEqual([]);
    expect(navPlatformItemsForRole("manager")).toEqual([]);
  });

  it("SB-8: cada rota platformOnly aparece exactamente uma vez, com labels de ROUTE_META", () => {
    const platformOnlyHrefs = Object.entries(ROUTE_META)
      .filter(([, meta]) => meta.platformOnly === true)
      .map(([href]) => href);

    const items = navPlatformItemsForRole("platform_admin");
    const hrefs = items.map((i) => i.href);

    expect(hrefs).toEqual(platformOnlyHrefs);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs.length).toBeGreaterThan(0);

    for (const item of items) {
      expect(item.label).toBe(ROUTE_META[item.href].label);
    }
  });

  it("SB-8: ordem canónica preservada (métricas → … → whatsapp)", () => {
    expect(navPlatformItemsForRole("platform_admin").map((i) => i.href)).toEqual([
      "/admin/metrics",
      "/admin/billing",
      "/admin/affiliates",
      "/admin/tenants",
      "/admin/agents",
      "/admin/conversations",
      "/admin/whatsapp",
    ]);
  });
});
