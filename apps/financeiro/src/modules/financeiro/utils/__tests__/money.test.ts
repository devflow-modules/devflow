import { describe, it, expect } from "vitest";
import { roundMoney, MONEY_EPS } from "@/modules/financeiro/utils/money";

describe("roundMoney", () => {
  it("arredonda para 2 casas", () => {
    expect(roundMoney(10.126)).toBe(10.13);
    expect(roundMoney(10.124)).toBe(10.12);
    expect(roundMoney(0.005)).toBe(0.01);
    expect(roundMoney(0.004)).toBe(0);
  });

  it("lida com finitos inválidos", () => {
    expect(roundMoney(Number.NaN)).toBe(0);
    expect(roundMoney(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("MONEY_EPS usado em comparações", () => {
    expect(MONEY_EPS).toBe(0.005);
  });
});
