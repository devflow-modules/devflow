import { describe, it, expect } from "vitest";
import {
  daysSinceLastContactAt,
  getContactStalePresentation,
  buildStaleLeadWhereInput,
} from "./admin-lead-stale";

describe("admin-lead-stale", () => {
  it("daysSinceLastContactAt null quando sem data", () => {
    expect(daysSinceLastContactAt(null)).toBeNull();
  });

  it("calcula dias inteiros desde o último contato", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    const last = new Date("2026-01-07T10:00:00Z");
    expect(daysSinceLastContactAt(last, now)).toBe(3);
  });

  it("getContactStalePresentation: nunca contatado", () => {
    expect(getContactStalePresentation(null, null)).toEqual({
      kind: "nunca",
      label: "Nunca contatado",
    });
  });

  it("getContactStalePresentation: faixas de severidade", () => {
    const d0 = new Date().toISOString();
    expect(getContactStalePresentation(d0, 2).kind).toBe("ok");
    expect(getContactStalePresentation(d0, 4).label).toMatch(/Sem resposta há 4 dias/);
    expect(getContactStalePresentation(d0, 6).kind).toBe("esfriando");
    expect(getContactStalePresentation(d0, 8).kind).toBe("critico");
  });

  it("buildStaleLeadWhereInput inclui sem contato ou último contato antigo", () => {
    const w = buildStaleLeadWhereInput(new Date("2026-06-15T12:00:00Z"));
    expect(w.OR).toHaveLength(2);
  });
});
