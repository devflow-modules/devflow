import { describe, it, expect } from "vitest";
import { DEMO_ACCOUNT_NAMES, DEMO_SOURCE_NAMES } from "../constants";
import {
  demoCategoryName,
  demoSeedInvariantCheck,
  isDemoAccountName,
  logFinanceiroDemo,
  parseSeedCliArgs,
  plannedDemoExpenseTotalsByCategory,
  ymd,
} from "../helpers";

describe("demo-seed helpers", () => {
  it("ymd formata ISO local", () => {
    expect(ymd(2026, 3, 5)).toBe("2026-03-05");
    expect(ymd(2026, 12, 1)).toBe("2026-12-01");
  });

  it("isDemoAccountName reconhece contas oficiais do seed", () => {
    expect(isDemoAccountName(DEMO_ACCOUNT_NAMES[0])).toBe(true);
    expect(isDemoAccountName("Conta real")).toBe(false);
  });

  it("demoCategoryName aplica marcador comercial", () => {
    expect(demoCategoryName("Supermercado")).toContain("Supermercado");
    expect(demoCategoryName("Supermercado")).toContain("demo");
  });

  it("parseSeedCliArgs lê email e reset", () => {
    expect(parseSeedCliArgs(["--email", "a@b.com", "--reset-demo"])).toEqual({
      email: "a@b.com",
      resetDemo: true,
    });
    expect(parseSeedCliArgs([])).toEqual({ email: null, resetDemo: false });
  });

  it("demoSeedInvariantCheck expõe listas estáveis", () => {
    const inv = demoSeedInvariantCheck();
    expect(inv.accountNames).toEqual(DEMO_ACCOUNT_NAMES);
    expect(inv.sourceNames).toEqual(DEMO_SOURCE_NAMES);
    expect(inv.marker).toBeTruthy();
    expect(inv.rulePrefix).toContain("Demo");
  });

  it("plannedDemoExpenseTotalsByCategory soma categorias seed", () => {
    const t = plannedDemoExpenseTotalsByCategory();
    const total = Object.values(t).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(5000);
    expect(t[demoCategoryName("Supermercado")]).toBeGreaterThan(400);
  });

  it("logFinanceiroDemo não lança", () => {
    expect(() => logFinanceiroDemo("test_event", { householdId: "h1" })).not.toThrow();
  });
});
