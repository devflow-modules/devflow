/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockLocalStorage } from "@/test-utils/mockLocalStorage";
import {
  clearFinanceiroLastAction,
  getFinanceiroLastAction,
  setFinanceiroLastAction,
} from "../lastActionStorage";

const valid = {
  kind: "expense",
  title: "Teste",
  href: "/ferramentas/financeiro/expenses",
  at: new Date().toISOString(),
};

describe("lastActionStorage", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMockLocalStorage());
  });

  it("null sem dados ou schema inválido", () => {
    expect(getFinanceiroLastAction()).toBeNull();
    localStorage.setItem("financeiro_last_action_v1", "{}");
    expect(getFinanceiroLastAction()).toBeNull();
    localStorage.setItem("financeiro_last_action_v1", "broken");
    expect(getFinanceiroLastAction()).toBeNull();
  });

  it("round-trip válido e clear", () => {
    const refresh = vi.fn();
    window.addEventListener("financeiro-operational-refresh", refresh);
    setFinanceiroLastAction(valid);
    expect(getFinanceiroLastAction()).toMatchObject({ kind: "expense", title: "Teste" });
    expect(refresh).toHaveBeenCalled();
    clearFinanceiroLastAction();
    expect(getFinanceiroLastAction()).toBeNull();
    window.removeEventListener("financeiro-operational-refresh", refresh);
  });
});
