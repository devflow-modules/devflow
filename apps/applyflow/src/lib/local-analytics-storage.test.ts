import { afterEach, describe, expect, it, vi } from "vitest";

import {
  APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY,
  loadDashboardAnalytics,
  persistDashboardAnalytics,
  upsertAnalyticsOutcome,
} from "./local-analytics-storage.js";

function stubStorage(initial?: Record<string, string>) {
  const storage: Record<string, string> = { ...initial };
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => (k in storage ? storage[k]! : null),
      setItem: (k: string, v: string) => {
        storage[k] = v;
      },
      removeItem: (k: string) => {
        delete storage[k];
      },
    },
  } as Window & typeof globalThis);
  return storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("local-analytics-storage", () => {
  it("persiste outcomes raw sem métricas derivadas", () => {
    const storage = stubStorage();
    persistDashboardAnalytics(
      [
        {
          applicationId: "a1",
          createdAt: "2026-09-01T00:00:00.000Z",
          updatedAt: "2026-09-01T00:00:00.000Z",
          rejectionReasonSource: "unknown",
        },
      ],
      [],
      [],
    );
    expect(loadDashboardAnalytics().outcomes[0]?.applicationId).toBe("a1");
    expect(storage[APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY]).not.toContain("responseRate");
  });

  it("upsert substitui o outcome da mesma candidatura", () => {
    stubStorage();
    upsertAnalyticsOutcome({
      applicationId: "a1",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    });
    upsertAnalyticsOutcome({
      applicationId: "a1",
      screeningAt: "2026-09-03T00:00:00.000Z",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-03T00:00:00.000Z",
    });
    expect(loadDashboardAnalytics().outcomes).toHaveLength(1);
    expect(loadDashboardAnalytics().outcomes[0]?.screeningAt).toBe("2026-09-03T00:00:00.000Z");
  });

  it("não substitui um snapshot já persistido", () => {
    stubStorage();
    upsertAnalyticsOutcome({
      applicationId: "a1",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      snapshot: {
        capturedAt: "2026-09-01T00:00:00.000Z",
        overallFit: 64,
        dimensions: {
          overall: 64,
          coreEngineering: 80,
          stack: 55,
          specialization: 50,
          seniority: 70,
          product: 75,
        },
        decision: "apply_normal",
        priority: 58,
        requirements: [{ id: "req-elixir", label: "Elixir", category: "backend", status: "gap" }],
        supportingEvidenceIds: ["seed-whatsapp-platform"],
        primaryCaseIds: [],
      },
    });
    upsertAnalyticsOutcome({
      applicationId: "a1",
      screeningAt: "2026-09-03T00:00:00.000Z",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-03T00:00:00.000Z",
      snapshot: {
        capturedAt: "2026-09-03T00:00:00.000Z",
        overallFit: 91,
        dimensions: {
          overall: 91,
          coreEngineering: 90,
          stack: 90,
          specialization: 90,
          seniority: 90,
          product: 90,
        },
        decision: "apply_high",
        priority: 90,
        requirements: [{ id: "req-elixir", label: "Elixir", category: "backend", status: "proven" }],
        supportingEvidenceIds: ["new-evidence"],
        primaryCaseIds: [],
      },
    });
    const stored = loadDashboardAnalytics().outcomes[0];
    expect(stored?.screeningAt).toBe("2026-09-03T00:00:00.000Z");
    expect(stored?.snapshot?.overallFit).toBe(64);
    expect(stored?.snapshot?.requirements[0]?.status).toBe("gap");
    expect(stored?.snapshot?.supportingEvidenceIds).toEqual(["seed-whatsapp-platform"]);
  });

  it("elementos inválidos não passam como outcomes e não são sobrescritos no upsert", () => {
    const storage = stubStorage({
      [APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "2026-09-09T12:00:00.000Z",
        outcomes: [null, { foo: 1 }],
        events: [],
        efforts: [],
      }),
    });
    const loaded = loadDashboardAnalytics();
    expect(loaded.status).toBe("unreadable");
    expect(loaded.outcomes).toEqual([]);
    upsertAnalyticsOutcome({
      applicationId: "a1",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    });
    expect(JSON.parse(storage[APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY]!).outcomes).toEqual([null, { foo: 1 }]);
  });

  it("leitura aplica o snapshot sobre campos históricos divergentes", () => {
    stubStorage({
      [APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "2026-09-09T12:00:00.000Z",
        outcomes: [
          {
            applicationId: "a1",
            createdAt: "2026-09-01T00:00:00.000Z",
            updatedAt: "2026-09-01T00:00:00.000Z",
            fitAtApplication: 12,
            decisionAtApplication: "apply_high",
            priorityAtApplication: 99,
            resumeVariant: "rewritten-later",
            snapshot: {
              capturedAt: "2026-09-01T00:00:00.000Z",
              overallFit: 64,
              dimensions: {
                overall: 64,
                coreEngineering: 80,
                stack: 55,
                specialization: 50,
                seniority: 70,
                product: 75,
              },
              decision: "apply_normal",
              priority: 58,
              requirements: [],
              supportingEvidenceIds: [],
              primaryCaseIds: [],
              resumeVariant: "rv_smoke",
            },
          },
        ],
        events: [],
        efforts: [],
      }),
    });
    const loaded = loadDashboardAnalytics().outcomes[0];
    expect(loaded?.fitAtApplication).toBe(64);
    expect(loaded?.decisionAtApplication).toBe("apply_normal");
    expect(loaded?.priorityAtApplication).toBe(58);
    expect(loaded?.resumeVariant).toBe("rv_smoke");
  });

  it("não apaga appliedAt quando um upsert posterior omite o campo", () => {
    stubStorage();
    upsertAnalyticsOutcome({
      applicationId: "a1",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      appliedAt: "2026-09-02T00:00:00.000Z",
      snapshot: {
        capturedAt: "2026-09-01T00:00:00.000Z",
        overallFit: 88,
        dimensions: {
          overall: 88,
          coreEngineering: 88,
          stack: 88,
          specialization: 88,
          seniority: 88,
          product: 88,
        },
        decision: "apply_normal",
        priority: 80,
        requirements: [],
        supportingEvidenceIds: [],
        primaryCaseIds: [],
      },
    });
    upsertAnalyticsOutcome({
      applicationId: "a1",
      screeningAt: "2026-09-03T00:00:00.000Z",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-03T00:00:00.000Z",
    });
    const stored = loadDashboardAnalytics().outcomes[0];
    expect(stored?.appliedAt).toBe("2026-09-02T00:00:00.000Z");
    expect(stored?.snapshot?.overallFit).toBe(88);
    expect(stored?.screeningAt).toBe("2026-09-03T00:00:00.000Z");
  });
});
