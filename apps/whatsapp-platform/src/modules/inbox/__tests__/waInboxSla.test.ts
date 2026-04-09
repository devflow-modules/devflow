import { describe, it, expect } from "vitest";
import {
  computeResponseDelayMs,
  computeSlaLevel,
  formatCompactWaitDurationMs,
  formatWaitDurationMs,
  SLA_TIER_HIGH_MAX_MS,
  SLA_TIER_LOW_MAX_MS,
  SLA_TIER_MEDIUM_MAX_MS,
  slaLevelToSortRank,
} from "../waInboxSla";

describe("computeSlaLevel", () => {
  it("null quando sem atraso", () => {
    expect(computeSlaLevel(null)).toBe(null);
  });

  it("low abaixo de 5 min", () => {
    expect(computeSlaLevel(SLA_TIER_LOW_MAX_MS - 1)).toBe("low");
  });

  it("medium entre 5 e 15 min", () => {
    expect(computeSlaLevel(SLA_TIER_LOW_MAX_MS)).toBe("medium");
    expect(computeSlaLevel(SLA_TIER_MEDIUM_MAX_MS - 1)).toBe("medium");
  });

  it("high entre 15 e 30 min", () => {
    expect(computeSlaLevel(SLA_TIER_MEDIUM_MAX_MS)).toBe("high");
    expect(computeSlaLevel(SLA_TIER_HIGH_MAX_MS - 1)).toBe("high");
  });

  it("critical a partir de 30 min", () => {
    expect(computeSlaLevel(SLA_TIER_HIGH_MAX_MS)).toBe("critical");
    expect(computeSlaLevel(SLA_TIER_HIGH_MAX_MS + 60_000)).toBe("critical");
  });
});

describe("computeResponseDelayMs", () => {
  it("null se não awaiting_agent", () => {
    const t = new Date("2025-06-01T12:00:00Z");
    expect(computeResponseDelayMs(false, t, new Date("2025-06-01T12:30:00Z"))).toBe(null);
  });

  it("ms desde última inbound pendente quando awaiting", () => {
    const last = new Date("2025-06-01T12:00:00Z");
    const now = new Date("2025-06-01T12:10:00Z");
    expect(computeResponseDelayMs(true, last, now)).toBe(10 * 60 * 1000);
  });
});

describe("slaLevelToSortRank", () => {
  it("critical ordena antes de low na lista (rank maior)", () => {
    expect(slaLevelToSortRank("critical")! > slaLevelToSortRank("low")!).toBe(true);
  });
});

describe("formatWaitDurationMs", () => {
  it("formata minutos e horas", () => {
    expect(formatWaitDurationMs(30_000)).toBe("< 1 min");
    expect(formatWaitDurationMs(5 * 60_000)).toBe("5 min");
    expect(formatWaitDurationMs(90 * 60_000)).toBe("1h 30 min");
  });
});

describe("formatCompactWaitDurationMs", () => {
  it("compacta para lista (m / h)", () => {
    expect(formatCompactWaitDurationMs(30_000)).toBe("<1m");
    expect(formatCompactWaitDurationMs(12 * 60_000)).toBe("12m");
    expect(formatCompactWaitDurationMs(90 * 60_000)).toBe("1h30m");
    expect(formatCompactWaitDurationMs(120 * 60_000)).toBe("2h");
  });
});
