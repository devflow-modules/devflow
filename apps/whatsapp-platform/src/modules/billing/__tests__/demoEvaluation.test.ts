import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  FREE_EVALUATION_STALE_DAYS,
  evaluationModeBadgeLabel,
  formatFreeEvaluationUsageCounts,
  freeEvaluationStaleMessage,
  isFreeEvaluationPlan,
} from "../demoEvaluation";

describe("demoEvaluation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("isFreeEvaluationPlan reconhece FREE normalizado", () => {
    expect(isFreeEvaluationPlan("FREE")).toBe(true);
    expect(isFreeEvaluationPlan("free")).toBe(true);
    expect(isFreeEvaluationPlan("OPERATIONAL_BASE")).toBe(false);
  });

  it("evaluationModeBadgeLabel só em FREE", () => {
    expect(evaluationModeBadgeLabel("FREE")).toBe("Modo avaliação ativo");
    expect(evaluationModeBadgeLabel("OPERATIONAL_BASE")).toBeNull();
  });

  it("freeEvaluationStaleMessage retorna aviso após minDays", () => {
    const created = new Date("2026-01-01T00:00:00.000Z").toISOString();
    expect(freeEvaluationStaleMessage("FREE", created, FREE_EVALUATION_STALE_DAYS)).toContain("avaliação");
  });

  it("freeEvaluationStaleMessage é null antes do período", () => {
    const created = new Date("2026-01-25T00:00:00.000Z").toISOString();
    expect(freeEvaluationStaleMessage("FREE", created, FREE_EVALUATION_STALE_DAYS)).toBeNull();
  });

  it("formatFreeEvaluationUsageCounts inclui mensagens e IA", () => {
    const s = formatFreeEvaluationUsageCounts(40, 50, 3, 10);
    expect(s).toContain("40");
    expect(s).toContain("50");
    expect(s).toContain("3");
    expect(s).toContain("10");
  });
});
