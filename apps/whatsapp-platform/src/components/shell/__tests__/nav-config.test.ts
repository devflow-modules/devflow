import { describe, expect, it } from "vitest";
import { primaryNavForRole, secondaryNavForRole } from "../nav-config";

describe("nav-config (produto por role)", () => {
  it("operador: Inbox + Automações na principal; sem secundária", () => {
    const primary = primaryNavForRole("operator");
    expect(primary.map((i) => i.href)).toEqual(["/inbox", "/automation"]);
    expect(primary.map((i) => i.label)).toEqual(["Inbox", "Automações"]);
    expect(secondaryNavForRole("operator")).toEqual([]);
  });

  it("admin (manager): painel completo na principal + secundária com billing e configurações", () => {
    const primary = primaryNavForRole("manager");
    expect(primary.map((i) => i.href)).toContain("/dashboard");
    expect(primary.map((i) => i.href)).toContain("/inbox");
    expect(primary.map((i) => i.href)).toContain("/automation");

    const secondary = secondaryNavForRole("manager");
    expect(secondary.some((i) => i.href === "/billing")).toBe(true);
    expect(secondary.some((i) => i.href === "/settings")).toBe(true);
  });
});
