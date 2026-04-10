import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAiFunnelMetrics } from "../aiFunnelMetricsService";

const groupBy = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    waInboxThread: {
      groupBy: (...a: unknown[]) => groupBy(...a),
    },
  },
}));

describe("getAiFunnelMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("agrega por aiState e normaliza null → lead", async () => {
    groupBy.mockResolvedValue([
      { aiState: null, _count: { _all: 2 } },
      { aiState: "negotiating", _count: { _all: 3 } },
      { aiState: "closed", _count: { _all: 1 } },
    ]);
    const m = await getAiFunnelMetrics("t1");
    expect(m.lead).toBe(2);
    expect(m.negotiating).toBe(3);
    expect(m.closed).toBe(1);
    expect(m.qualifying).toBe(0);
  });
});
