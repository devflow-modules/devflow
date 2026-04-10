import { describe, it, expect } from "vitest";
import { COMMERCIAL_TASK_TYPES } from "@/modules/commercial/commercialAutomationConstants";

/**
 * Espelha a lógica de mapeamento em systemHealthService (contagem por tipo).
 */
function mapPendingTasks(
  groups: Array<{ type: string; _count: { _all: number } }>
): { followUp: number; reactivation: number; recovery: number } {
  const m = Object.fromEntries(groups.map((g) => [g.type, g._count._all])) as Record<string, number>;
  return {
    followUp: m[COMMERCIAL_TASK_TYPES.FOLLOWUP] ?? 0,
    reactivation: m[COMMERCIAL_TASK_TYPES.REACTIVATION] ?? 0,
    recovery: m[COMMERCIAL_TASK_TYPES.RECOVERY] ?? 0,
  };
}

describe("mapPendingTasks (agrupamento FollowUpTask)", () => {
  it("soma por tipo followup / reactivation / recovery", () => {
    const out = mapPendingTasks([
      { type: "followup", _count: { _all: 12 } },
      { type: "reactivation", _count: { _all: 5 } },
      { type: "recovery", _count: { _all: 1 } },
    ]);
    expect(out).toEqual({ followUp: 12, reactivation: 5, recovery: 1 });
  });

  it("tipos em falta contam como zero", () => {
    const out = mapPendingTasks([{ type: "followup", _count: { _all: 3 } }]);
    expect(out.reactivation).toBe(0);
    expect(out.recovery).toBe(0);
  });
});
