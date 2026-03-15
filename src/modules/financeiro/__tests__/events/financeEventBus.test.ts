import { describe, it, expect, vi, beforeEach } from "vitest";
import { emit, subscribe } from "@/modules/financeiro/events/financeEventBus";
import type { FinanceEventPayload } from "@/modules/financeiro/events/financeEvents";

describe("financeEventBus", () => {
  it("deve chamar handler registrado ao emitir evento", () => {
    const handler = vi.fn<void, [string, FinanceEventPayload]>();
    subscribe("finance.expense.created", handler);

    emit("finance.expense.created", {
      householdId: "h1",
      userId: "u1",
      entityId: "exp-1",
      timestamp: "2025-03-01T00:00:00.000Z",
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      "finance.expense.created",
      expect.objectContaining({
        householdId: "h1",
        userId: "u1",
        entityId: "exp-1",
        timestamp: "2025-03-01T00:00:00.000Z",
      })
    );
  });

  it("deve chamar múltiplos handlers para o mesmo evento", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    subscribe("finance.income.created", h1);
    subscribe("finance.income.created", h2);

    emit("finance.income.created", { householdId: "h1", entityId: "inc-1" });

    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it("deve preencher timestamp quando não fornecido", () => {
    const handler = vi.fn();
    subscribe("finance.rule.created", handler);

    emit("finance.rule.created", { householdId: "h1" });

    expect(handler).toHaveBeenCalledWith(
      "finance.rule.created",
      expect.objectContaining({
        householdId: "h1",
        timestamp: expect.any(String),
      })
    );
  });
});
