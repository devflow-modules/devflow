import { describe, expect, it } from "vitest";

import type { ApplyFlowApplication } from "../application-types.js";
import {
  applyDashboardTableFilters,
  countStaleApplications,
  filterApplicationsByContract,
  filterApplicationsByEnglishRequired,
  filterApplicationsByPeriod,
  filterApplicationsBySkill,
  filterApplicationsByStatus,
  filterApplicationsByWorkModel,
} from "../dashboard-filters.js";
import { isApplicationStale7d } from "../application-metrics.js";

const NOW = new Date("2026-06-15T12:00:00.000Z");

function app(p: Partial<ApplyFlowApplication> & Pick<ApplyFlowApplication, "id" | "status">): ApplyFlowApplication {
  return {
    createdAt: "2026-06-10T10:00:00.000Z",
    updatedAt: "2026-06-10T10:00:00.000Z",
    source: "linkedin",
    ...p,
  } as ApplyFlowApplication;
}

describe("dashboard filters", () => {
  it("filtra por status", () => {
    const list = [app({ id: "1", status: "applied" }), app({ id: "2", status: "reviewing" })];
    expect(filterApplicationsByStatus(list, "applied")).toHaveLength(1);
    expect(filterApplicationsByStatus(list, "all")).toHaveLength(2);
  });

  it("filtra por período createdAt", () => {
    const list = [
      app({ id: "a", status: "reviewing", createdAt: "2026-06-14T10:00:00.000Z" }),
      app({ id: "b", status: "reviewing", createdAt: "2026-01-01T10:00:00.000Z" }),
    ];
    expect(filterApplicationsByPeriod(list, "7d", NOW)).toHaveLength(1);
  });

  it("filtra por skill", () => {
    const list = [
      app({
        id: "1",
        status: "reviewing",
        jobMeta: { detectedSkills: ["React", "Node"] },
      }),
      app({ id: "2", status: "reviewing" }),
    ];
    expect(filterApplicationsBySkill(list, "react")).toHaveLength(1);
  });

  it("filtra por modelo de trabalho", () => {
    const list = [
      app({ id: "1", status: "reviewing", jobMeta: { workModel: "remote" } }),
      app({ id: "2", status: "reviewing", jobMeta: { workModel: "hybrid" } }),
    ];
    expect(filterApplicationsByWorkModel(list, "remote")).toHaveLength(1);
  });

  it("filtra por contrato", () => {
    const list = [
      app({ id: "1", status: "reviewing", jobMeta: { contractType: "clt" } }),
      app({ id: "2", status: "reviewing", jobMeta: { contractType: "pj" } }),
    ];
    expect(filterApplicationsByContract(list, "clt")).toHaveLength(1);
  });

  it("filtra inglês exigido", () => {
    const list = [
      app({ id: "1", status: "reviewing", jobMeta: { englishRequired: true } }),
      app({ id: "2", status: "reviewing", jobMeta: { englishRequired: false } }),
    ];
    expect(filterApplicationsByEnglishRequired(list, "yes")).toHaveLength(1);
    expect(filterApplicationsByEnglishRequired(list, "no")).toHaveLength(1);
  });

  it("applyDashboardTableFilters combina filtros", () => {
    const list = [
      app({
        id: "1",
        status: "applied",
        createdAt: "2026-06-14T10:00:00.000Z",
        jobMeta: { workModel: "remote", detectedSkills: ["Go"] },
      }),
      app({
        id: "2",
        status: "applied",
        createdAt: "2026-06-14T10:00:00.000Z",
        jobMeta: { workModel: "hybrid", detectedSkills: ["Go"] },
      }),
    ];
    const out = applyDashboardTableFilters(
      list,
      {
        period: "30d",
        status: "applied",
        skill: "go",
        workModel: "remote",
        contractType: "all",
        englishRequired: "all",
      },
      NOW,
    );
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("1");
  });

  it("detecta candidaturas paradas (staleness)", () => {
    const stale = app({
      id: "1",
      status: "reviewing",
      updatedAt: "2026-06-01T10:00:00.000Z",
    });
    expect(isApplicationStale7d(stale, NOW)).toBe(true);
    expect(countStaleApplications([stale], NOW)).toBe(1);
  });
});
