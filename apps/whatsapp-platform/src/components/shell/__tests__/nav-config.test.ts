import { describe, expect, it, vi } from "vitest";
import {
  navAccountItemsForRole,
  navAutomationItemsForRole,
  navOperationItemsForRole,
  navTeamItemsForRole,
  primaryNavForRole,
  secondaryNavForRole,
} from "../nav-config";

describe("nav-config (produto por role)", () => {
  it("operador: compat NAV_PRIMARY = Inbox + Histórico + Automações; sem secundária", () => {
    const primary = primaryNavForRole("operator");
    expect(primary.map((i) => i.href)).toEqual(["/inbox", "/conversations", "/automation"]);
    expect(secondaryNavForRole("operator")).toEqual([]);
  });

  it("operador: sidebar — Operação (sem painel), Automação só regras, sem Conta, Equipe com agentes", () => {
    expect(navOperationItemsForRole("operator").map((i) => i.href)).toEqual([
      "/inbox",
      "/conversations",
      "/queues",
    ]);
    expect(navAutomationItemsForRole("operator").map((i) => i.href)).toEqual(["/automation"]);
    expect(navAccountItemsForRole("operator")).toEqual([]);
    expect(navTeamItemsForRole("operator").map((i) => i.href)).toEqual(["/agents"]);
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
});
