import { describe, it, expect } from "vitest";
import { buildConversionMetricsFromGroupBy, roundRate2 } from "./admin-lead-conversion-metrics";

describe("buildConversionMetricsFromGroupBy", () => {
  it("calcula totais, contato_iniciado e taxas com 2 casas", () => {
    const { byStatus, conversionMetrics, funnelStageCounts } = buildConversionMetricsFromGroupBy([
      { status: "novo", _count: { _all: 1 } },
      { status: "contato_iniciado", _count: { _all: 1 } },
      { status: "respondeu", _count: { _all: 1 } },
    ]);
    expect(byStatus).toEqual({ novo: 1, contato_iniciado: 1, respondeu: 1 });
    expect(conversionMetrics.total).toBe(3);
    expect(conversionMetrics.contatoIniciado).toBe(1);
    expect(funnelStageCounts.novo).toBe(1);
    expect(funnelStageCounts.respondeu).toBe(1);
    expect(conversionMetrics.responseRate).toBe(0.33);
    expect(conversionMetrics.closeRate).toBe(0);
  });

  it("total zero gera taxas nulas", () => {
    const { conversionMetrics } = buildConversionMetricsFromGroupBy([]);
    expect(conversionMetrics.total).toBe(0);
    expect(conversionMetrics.responseRate).toBeNull();
  });
});

describe("roundRate2", () => {
  it("arredonda taxa 0–1 em 2 decimais", () => {
    expect(roundRate2(0.3333)).toBe(0.33);
    expect(roundRate2(null)).toBeNull();
  });
});
