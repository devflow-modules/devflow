import { describe, expect, it } from "vitest";
import { computeRetentionUrgency, hasMovementOnCalendarDay } from "../computeRetentionUrgency";

describe("computeRetentionUrgency", () => {
  const now = new Date("2026-03-15T12:00:00");

  it("prioriza stale quando último lançamento há 3+ dias", () => {
    const u = computeRetentionUrgency(
      [{ amount: 1, receivedAt: "2026-03-10" }],
      [],
      0,
      now
    );
    expect(u?.kind).toBe("stale");
    expect(u?.message).toContain("desatualizado");
  });

  it("usa today_missing quando há dados recentes mas nada hoje", () => {
    const u = computeRetentionUrgency(
      [{ amount: 1, receivedAt: "2026-03-14" }],
      [],
      0,
      now
    );
    expect(u?.kind).toBe("today_missing");
  });

  it("mostra incomplete quando já lançou hoje e há checklist pendente", () => {
    const u = computeRetentionUrgency(
      [{ amount: 1, receivedAt: "2026-03-15" }],
      [{ amount: 2, dueDate: "2026-03-15", category: "X" }],
      2,
      now
    );
    expect(u?.kind).toBe("incomplete");
    expect(u?.pendingCount).toBe(2);
    expect(u?.message).toContain("Faltam 2");
  });

  it("retorna null quando hoje ok e checklist zerado", () => {
    expect(
      computeRetentionUrgency(
        [{ amount: 1, receivedAt: "2026-03-15" }],
        [],
        0,
        now
      )
    ).toBeNull();
  });
});

describe("hasMovementOnCalendarDay", () => {
  it("detecta receita no dia", () => {
    expect(
      hasMovementOnCalendarDay([{ receivedAt: "2026-03-15T00:00:00.000Z" }], [], "2026-03-15")
    ).toBe(true);
  });
});
