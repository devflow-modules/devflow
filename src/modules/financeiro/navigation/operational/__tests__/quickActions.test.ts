import { describe, expect, it } from "vitest";
import { getFinanceiroQuickActions } from "../quickActions";
import { FINANCEIRO_BASE_PATH } from "../../constants";

describe("getFinanceiroQuickActions", () => {
  it("OWNER retorna até 5 ações com rotas esperadas", () => {
    const actions = getFinanceiroQuickActions("OWNER");
    expect(actions).toHaveLength(5);
    expect(actions.map((a) => a.action_type)).toEqual([
      "new_expense",
      "new_income",
      "month_summary",
      "rules",
      "categories",
    ]);
    expect(actions[0].href).toContain(`${FINANCEIRO_BASE_PATH}/expenses#nova-despesa`);
    expect(actions.find((a) => a.action_type === "rules")?.href).toContain("/rules");
  });

  it("MEMBER inclui conta e categorias em vez de regras explícitas", () => {
    const actions = getFinanceiroQuickActions("MEMBER");
    expect(actions).toHaveLength(5);
    expect(actions.some((a) => a.action_type === "rules")).toBe(false);
    expect(actions.some((a) => a.action_type === "account")).toBe(true);
    expect(actions.some((a) => a.action_type === "categories")).toBe(true);
  });
});
