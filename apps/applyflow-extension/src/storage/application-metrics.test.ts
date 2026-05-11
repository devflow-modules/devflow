import { describe, expect, it } from "vitest";

import { applicationsToCsv } from "./application-history-export.js";
import {
  computeApplicationMetrics,
  getApplicationsByPeriod,
  isApplicationStale7d,
} from "./application-metrics.js";
import type { ApplyFlowApplication } from "./application-storage.js";

const FIXTURE_NOW = new Date("2026-06-15T12:00:00.000Z");

function app(p: Partial<ApplyFlowApplication> & Pick<ApplyFlowApplication, "id" | "status">): ApplyFlowApplication {
  return {
    createdAt: "2026-06-10T10:00:00.000Z",
    updatedAt: "2026-06-10T10:00:00.000Z",
    source: "linkedin",
    ...p,
  } as ApplyFlowApplication;
}

describe("computeApplicationMetrics", () => {
  it("lista vazia", () => {
    const m = computeApplicationMetrics([], FIXTURE_NOW);
    expect(m.total).toBe(0);
    expect(m.last7Days).toBe(0);
    expect(m.last30Days).toBe(0);
    expect(m.staleCount).toBe(0);
    expect(m.interviewRate).toBe(0);
    expect(m.technicalTestRate).toBe(0);
    expect(m.acceptedRate).toBe(0);
    expect(m.rejectedRate).toBe(0);
    expect(m.averageFitScore).toBeUndefined();
    expect(m.byStatus.reviewing).toBe(0);
    expect(m.englishRequiredCount).toBe(0);
    expect(m.skillsTop).toBeUndefined();
    expect(m.byRoleType.unknown).toBe(0);
    expect(m.byWorkModel.unknown).toBe(0);
    expect(m.byContractType.unknown).toBe(0);
  });

  it("agrega job intelligence (skills top, role, work, inglês)", () => {
    const list = [
      app({
        id: "1",
        status: "reviewing",
        jobMeta: {
          roleType: "frontend",
          workModel: "remote",
          contractType: "pj",
          englishRequired: true,
          detectedSkills: ["React", "TypeScript", "React"],
        },
      }),
      app({
        id: "2",
        status: "applied",
        jobMeta: {
          roleType: "backend",
          workModel: "remote",
          contractType: "clt",
          englishRequired: false,
          detectedSkills: ["PostgreSQL", "TypeScript"],
        },
      }),
    ];
    const m = computeApplicationMetrics(list, FIXTURE_NOW);
    expect(m.englishRequiredCount).toBe(1);
    expect(m.byRoleType.frontend).toBe(1);
    expect(m.byRoleType.backend).toBe(1);
    expect(m.byWorkModel.remote).toBe(2);
    expect(m.byContractType.pj).toBe(1);
    expect(m.byContractType.clt).toBe(1);
    expect(m.skillsTop?.find((x) => x.skill === "React")?.count).toBe(2);
    expect(m.skillsTop?.find((x) => x.skill === "TypeScript")?.count).toBe(2);
  });

  it("contagem por status", () => {
    const list = [
      app({ id: "1", status: "reviewing" }),
      app({ id: "2", status: "interview" }),
      app({ id: "3", status: "interview" }),
    ];
    const m = computeApplicationMetrics(list, FIXTURE_NOW);
    expect(m.byStatus.reviewing).toBe(1);
    expect(m.byStatus.interview).toBe(2);
    expect(m.total).toBe(3);
  });

  it("last7Days e last30Days por createdAt", () => {
    const list = [
      app({ id: "a", status: "ignored", createdAt: "2026-06-14T10:00:00.000Z" }),
      app({ id: "b", status: "ignored", createdAt: "2026-06-01T10:00:00.000Z" }),
      app({ id: "c", status: "ignored", createdAt: "2026-05-10T10:00:00.000Z" }),
    ];
    const m = computeApplicationMetrics(list, FIXTURE_NOW);
    expect(m.last7Days).toBe(1);
    expect(m.last30Days).toBe(2);
  });

  it("staleCount para reviewing/applied/waiting_response com updatedAt antigo", () => {
    const list = [
      app({
        id: "1",
        status: "reviewing",
        updatedAt: "2026-06-07T08:00:00.000Z",
        createdAt: "2026-06-06T08:00:00.000Z",
      }),
      app({
        id: "2",
        status: "applied",
        updatedAt: "2026-06-07T08:00:00.000Z",
      }),
      app({
        id: "3",
        status: "interview",
        updatedAt: "2026-06-07T08:00:00.000Z",
      }),
      app({
        id: "4",
        status: "reviewing",
        updatedAt: "2026-06-14T10:00:00.000Z",
      }),
    ];
    expect(isApplicationStale7d(list[0]!, FIXTURE_NOW)).toBe(true);
    expect(isApplicationStale7d(list[2]!, FIXTURE_NOW)).toBe(false);
    const m = computeApplicationMetrics(list, FIXTURE_NOW);
    expect(m.staleCount).toBe(2);
  });

  it("rates e média fit", () => {
    const list = [
      app({
        id: "1",
        status: "interview",
        fitScore: 10,
        createdAt: "2026-06-01T08:00:00.000Z",
        updatedAt: "2026-06-01T08:00:00.000Z",
      }),
      app({
        id: "2",
        status: "technical_test",
        fitScore: 20,
        createdAt: "2026-06-01T08:00:00.000Z",
        updatedAt: "2026-06-01T08:00:00.000Z",
      }),
      app({
        id: "3",
        status: "accepted",
        fitScore: 30,
        createdAt: "2026-06-01T08:00:00.000Z",
        updatedAt: "2026-06-01T08:00:00.000Z",
      }),
      app({
        id: "4",
        status: "rejected",
        createdAt: "2026-06-01T08:00:00.000Z",
        updatedAt: "2026-06-01T08:00:00.000Z",
      }),
    ];
    const m = computeApplicationMetrics(list, FIXTURE_NOW);
    expect(m.interviewRate).toBe(0.25);
    expect(m.technicalTestRate).toBe(0.25);
    expect(m.acceptedRate).toBe(0.25);
    expect(m.rejectedRate).toBe(0.25);
    expect(m.averageFitScore).toBe((10 + 20 + 30) / 3);
  });

  it("rates zero se total zero", () => {
    expect(computeApplicationMetrics([], FIXTURE_NOW).interviewRate).toBe(0);
  });
});

describe("getApplicationsByPeriod", () => {
  const apps = [
    app({
      id: "x",
      status: "reviewing",
      createdAt: "2026-06-14T10:00:00.000Z",
    }),
    app({
      id: "y",
      status: "reviewing",
      createdAt: "2026-05-20T10:00:00.000Z",
    }),
    app({
      id: "z",
      status: "reviewing",
      createdAt: "2026-03-20T10:00:00.000Z",
    }),
  ];

  it("all devolve tudo", () => {
    expect(getApplicationsByPeriod(apps, "all", FIXTURE_NOW)).toHaveLength(3);
  });

  it("7d", () => {
    expect(getApplicationsByPeriod(apps, "7d", FIXTURE_NOW).map((a) => a.id)).toEqual(["x"]);
  });

  it("30d inclui x e y", () => {
    const ids = getApplicationsByPeriod(apps, "30d", FIXTURE_NOW)
      .map((a) => a.id)
      .sort();
    expect(ids).toEqual(["x", "y"]);
  });

  it("90d inclui z além das recentes", () => {
    expect(getApplicationsByPeriod(apps, "90d", FIXTURE_NOW)).toHaveLength(3);
  });
});

describe("CSV com subconjunto filtrado (função pura)", () => {
  it("applicationsToCsv reflecte apenas os itens passados", () => {
    const subset = [
      app({
        id: "csv1",
        status: "applied",
        jobTitle: "A",
        companyName: "B",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        jobUrl: "https://ln.test/1",
      }),
    ];
    const csv = applicationsToCsv(subset);
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("B");
    expect(lines[1]).toContain("A");
  });
});
