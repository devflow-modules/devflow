/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockLocalStorage } from "@/test-utils/mockLocalStorage";
import {
  getFinanceiroRecentRoutes,
  recordFinanceiroRecentRoute,
} from "../recentRoutesStorage";

describe("recentRoutesStorage", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMockLocalStorage());
  });

  it("retorna [] sem dados ou JSON inválido", () => {
    expect(getFinanceiroRecentRoutes()).toEqual([]);
    localStorage.setItem("financeiro_recent_routes_v1", "not-json");
    expect(getFinanceiroRecentRoutes()).toEqual([]);
    localStorage.setItem("financeiro_recent_routes_v1", JSON.stringify([{ path: "" }]));
    expect(getFinanceiroRecentRoutes()).toEqual([]);
  });

  it("deduplica e mantém no máximo 5 entradas", () => {
    recordFinanceiroRecentRoute("/ferramentas/financeiro/expenses");
    recordFinanceiroRecentRoute("/ferramentas/financeiro/rules");
    recordFinanceiroRecentRoute("/ferramentas/financeiro/expenses");
    const list = getFinanceiroRecentRoutes();
    expect(list.length).toBe(2);
    expect(list[0].path).toBe("/ferramentas/financeiro/expenses");
    const paths = [
      "/ferramentas/financeiro/dashboard",
      "/ferramentas/financeiro/expenses",
      "/ferramentas/financeiro/rules",
      "/ferramentas/financeiro/sources",
      "/ferramentas/financeiro/settings",
      "/ferramentas/financeiro/dashboard",
    ];
    for (const p of paths) {
      recordFinanceiroRecentRoute(p);
    }
    expect(getFinanceiroRecentRoutes().length).toBeLessThanOrEqual(5);
  });

  it("ignora path não persistível (onboarding)", () => {
    recordFinanceiroRecentRoute("/ferramentas/financeiro/onboarding");
    expect(getFinanceiroRecentRoutes()).toEqual([]);
  });
});
