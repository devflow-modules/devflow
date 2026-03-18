import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkFinancialRateLimit } from "@/app/api/_helpers/financialRateLimit";

describe("checkFinancialRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
  });

  it("permite até 20 req e bloqueia na 21ª", () => {
    const uid = "user-rate-test";
    for (let i = 0; i < 20; i++) {
      expect(checkFinancialRateLimit(uid)).toBeNull();
    }
    const blocked = checkFinancialRateLimit(uid);
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
  });

  it("libera após janela de 60s", () => {
    const uid = "user-rate-window";
    for (let i = 0; i < 20; i++) checkFinancialRateLimit(uid);
    expect(checkFinancialRateLimit(uid)).not.toBeNull();
    vi.advanceTimersByTime(61_000);
    expect(checkFinancialRateLimit(uid)).toBeNull();
  });
});
