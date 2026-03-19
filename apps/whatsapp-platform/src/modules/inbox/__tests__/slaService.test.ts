import { describe, it, expect } from "vitest";
import {
  calculateFirstResponseTime,
  calculateResponseTime,
  getSlaStatus,
} from "../slaService";

function thread(overrides: Partial<{
  createdAt: Date;
  lastCustomerMessageAt: Date | null;
  lastAgentReplyAt: Date | null;
  firstResponseAt: Date | null;
}> = {}) {
  const base = new Date("2025-03-15T10:00:00Z");
  return {
    createdAt: base,
    lastCustomerMessageAt: null,
    lastAgentReplyAt: null,
    firstResponseAt: null,
    ...overrides,
  } as Parameters<typeof getSlaStatus>[0];
}

describe("slaService", () => {
  it("calculateFirstResponseTime retorna minutos entre primeiro cliente e firstResponseAt", () => {
    const t = thread({
      lastCustomerMessageAt: new Date("2025-03-15T10:00:00Z"),
      firstResponseAt: new Date("2025-03-15T10:05:00Z"),
    });
    expect(calculateFirstResponseTime(t)).toBe(5);
  });

  it("calculateFirstResponseTime retorna null quando firstResponseAt ausente", () => {
    const t = thread({ lastCustomerMessageAt: new Date() });
    expect(calculateFirstResponseTime(t)).toBe(null);
  });

  it("calculateResponseTime retorna minutos entre lastCustomer e lastAgent", () => {
    const t = thread({
      lastCustomerMessageAt: new Date("2025-03-15T10:00:00Z"),
      lastAgentReplyAt: new Date("2025-03-15T10:02:00Z"),
    });
    expect(calculateResponseTime(t)).toBe(2);
  });

  it("getSlaStatus retorna waitingSince quando cliente esperando resposta", () => {
    const lastC = new Date(Date.now() - 10 * 60 * 1000);
    const t = thread({ lastCustomerMessageAt: lastC, lastAgentReplyAt: null });
    const info = getSlaStatus(t, 30);
    expect(info.waitingSince).toEqual(lastC);
    expect(info.withinSla).toBe(true);
  });
});
