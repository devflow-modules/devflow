import { describe, it, expect } from "vitest";
import { householdCreateSchema } from "@/modules/financeiro/schemas";

describe("onboarding (smoke)", () => {
  it("aceita payload mínimo típico de apresentação", () => {
    const parsed = householdCreateSchema.parse({
      name: "Casa Demo",
      slug: "casa-demo",
      timezone: "America/Sao_Paulo",
    });
    expect(parsed.name).toBe("Casa Demo");
    expect(parsed.slug).toBe("casa-demo");
  });

  it("rejeita slug inválido", () => {
    const r = householdCreateSchema.safeParse({
      name: "Ab",
      slug: "CASA-MAIUSCULO",
    });
    expect(r.success).toBe(false);
  });
});
