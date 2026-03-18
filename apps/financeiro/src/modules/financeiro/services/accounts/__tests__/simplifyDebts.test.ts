import { describe, it, expect } from "vitest";
import { simplifyDebts } from "@/modules/financeiro/services/accounts/simplifyDebts";

describe("simplifyDebts", () => {
  it("minimiza transferências (2 devedores 1 credor)", () => {
    const t = simplifyDebts({ A: -100, B: -100, C: 200 });
    expect(t).toHaveLength(2);
    expect(t).toEqual(
      expect.arrayContaining([
        { from: "A", to: "C", amount: 100 },
        { from: "B", to: "C", amount: 100 },
      ])
    );
  });

  it("soma das transferências fecha o saldo", () => {
    const balances = { X: -30.333, Y: 30.33 };
    const t = simplifyDebts(balances);
    let x = -30.333;
    let y = 30.33;
    for (const { from, to, amount } of t) {
      if (from === "X") x += amount;
      if (to === "X") x -= amount;
      if (from === "Y") y += amount;
      if (to === "Y") y -= amount;
    }
    expect(Math.abs(x)).toBeLessThan(0.02);
    expect(Math.abs(y)).toBeLessThan(0.02);
  });

  it("retorna vazio quando zerado", () => {
    expect(simplifyDebts({ a: 0, b: 0 })).toEqual([]);
  });
});
