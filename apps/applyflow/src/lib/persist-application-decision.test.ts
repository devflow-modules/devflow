import { afterEach, describe, expect, it, vi } from "vitest";

import { APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY } from "./local-analytics-storage";
import { APPLYFLOW_DASHBOARD_STORAGE_KEY } from "./local-import-storage";
import {
  computeClosedLoopV1Backfill,
  persistApplicationStatusTransition,
  persistApplicationSubmitted,
  persistApplicationWithOutcome,
  persistClosedLoopV1Backfill,
  persistInboundResponseConfirmation,
  persistInboundResponseDismissal,
} from "./persist-application-decision";
import type { ResponseDetection } from "@devflow/applyflow-core";
import { APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY } from "./local-inbound-response-storage";

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

const application = {
  id: "app-1",
  createdAt: "2026-09-09T12:00:00.000Z",
  updatedAt: "2026-09-09T12:00:00.000Z",
  source: "paste" as const,
  status: "reviewing" as const,
};

const outcome = {
  applicationId: "app-1",
  createdAt: "2026-09-09T12:00:00.000Z",
  updatedAt: "2026-09-09T12:00:00.000Z",
  snapshot: {
    capturedAt: "2026-09-09T12:00:00.000Z",
    overallFit: 70,
    dimensions: {
      overall: 70,
      coreEngineering: 70,
      stack: 70,
      specialization: 70,
      seniority: 70,
      product: 70,
    },
    decision: "apply_normal" as const,
    priority: 60,
    requirements: [],
    supportingEvidenceIds: [],
    primaryCaseIds: [],
  },
};

describe("persistApplicationWithOutcome", () => {
  it("grava Application e Outcome juntos", () => {
    stubStorage();
    expect(persistApplicationWithOutcome({ application, outcome }).ok).toBe(true);
  });

  it("recusa outcome com applicationId diferente e não grava Application órfã", () => {
    const storage = stubStorage();
    const result = persistApplicationWithOutcome({
      application,
      outcome: { ...outcome, applicationId: "job-1" },
    });
    expect(result.ok).toBe(false);
    expect(storage[APPLYFLOW_DASHBOARD_STORAGE_KEY]).toBeUndefined();
  });

  it("restaura Application se a escrita do Outcome falhar", () => {
    const storage: Record<string, string> = {};
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => (k in storage ? storage[k]! : null),
        setItem: (k: string, v: string) => {
          if (k === APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY) {
            throw new Error("quota");
          }
          storage[k] = v;
        },
        removeItem: (k: string) => {
          delete storage[k];
        },
      },
    } as Window & typeof globalThis);
    const result = persistApplicationWithOutcome({ application, outcome });
    expect(result.ok).toBe(false);
    const storedApps = storage[APPLYFLOW_DASHBOARD_STORAGE_KEY]
      ? (JSON.parse(storage[APPLYFLOW_DASHBOARD_STORAGE_KEY]!) as { applications?: { id: string }[] }).applications
      : [];
    expect(storedApps ?? []).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: "app-1" })]));
  });

  it("não grava sobre analytics ilegível", () => {
    const storage = stubStorage({
      [APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "2026-09-09T12:00:00.000Z",
        outcomes: [null],
        events: [],
        efforts: [],
      }),
    });
    const result = persistApplicationWithOutcome({ application, outcome });
    expect(result.ok).toBe(false);
    expect(JSON.parse(storage[APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY]!).outcomes).toEqual([null]);
  });
});

describe("persistApplicationSubmitted", () => {
  it("actualiza o mesmo Application para applied e não cria outro registo", () => {
    stubStorage();
    expect(persistApplicationWithOutcome({ application, outcome }).ok).toBe(true);
    const result = persistApplicationSubmitted(application);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.application.id).toBe("app-1");
    expect(result.application.status).toBe("applied");
    const stored = JSON.parse(window.localStorage.getItem(APPLYFLOW_DASHBOARD_STORAGE_KEY)!) as {
      applications: { id: string; status: string }[];
    };
    expect(stored.applications).toHaveLength(1);
    expect(stored.applications[0]).toEqual(expect.objectContaining({ id: "app-1", status: "applied" }));
    const analytics = JSON.parse(window.localStorage.getItem(APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY)!) as {
      outcomes: { applicationId: string; finalStatus?: string; snapshot?: { overallFit: number }; appliedAt?: string }[];
      events: { type: string }[];
    };
    expect(analytics.outcomes).toHaveLength(1);
    expect(analytics.outcomes[0]?.finalStatus).toBe("applied");
    expect(analytics.outcomes[0]?.snapshot?.overallFit).toBe(70);
    expect(analytics.outcomes[0]?.appliedAt).toBeTruthy();
    expect(analytics.events).toHaveLength(1);
    expect(analytics.events[0]?.type).toBe("applied");
  });

  it("applied with INCONCLUSIVA snapshot does not rewrite recommendation to APPLY", () => {
    stubStorage();
    const inconclusive = {
      ...outcome,
      snapshot: { ...outcome.snapshot, decision: "needs_info" as const, overallFit: 58 },
    };
    expect(persistApplicationWithOutcome({ application, outcome: inconclusive }).ok).toBe(true);
    const result = persistApplicationSubmitted(application);
    expect(result.ok).toBe(true);
    const analytics = JSON.parse(window.localStorage.getItem(APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY)!) as {
      outcomes: { decisionAtApplication?: string; snapshot?: { decision: string; overallFit: number } }[];
    };
    expect(analytics.outcomes[0]?.snapshot?.decision).toBe("needs_info");
    expect(analytics.outcomes[0]?.snapshot?.overallFit).toBe(58);
    expect(analytics.outcomes[0]?.decisionAtApplication).toBe("needs_info");
  });

  it("rejeita hired a partir de applied", () => {
    stubStorage();
    expect(persistApplicationWithOutcome({ application, outcome }).ok).toBe(true);
    const submitted = persistApplicationSubmitted(application);
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    const hired = persistApplicationStatusTransition({
      application: submitted.application,
      toStatus: "hired",
    });
    expect(hired.ok).toBe(false);
  });
});

describe("persistClosedLoopV1Backfill", () => {
  it("preenche appliedAt a partir de updatedAt sem recalcular o snapshot", () => {
    stubStorage();
    const applied = {
      ...application,
      status: "applied" as const,
      updatedAt: "2026-09-15T03:04:24.620Z",
    };
    expect(persistApplicationWithOutcome({ application: applied, outcome }).ok).toBe(true);
    const first = persistClosedLoopV1Backfill(new Date("2026-09-15T12:00:00.000Z"));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.changed).toBe(true);
    const analytics = JSON.parse(window.localStorage.getItem(APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY)!) as {
      outcomes: { appliedAt?: string; snapshot?: { overallFit: number; decision: string } }[];
      events: { type: string; source?: string }[];
    };
    expect(analytics.outcomes[0]?.appliedAt).toBe("2026-09-15T03:04:24.620Z");
    expect(analytics.outcomes[0]?.snapshot?.overallFit).toBe(70);
    expect(analytics.outcomes[0]?.snapshot?.decision).toBe("apply_normal");
    expect(analytics.events.some((item) => item.type === "applied" && item.source === "backfill")).toBe(true);
    const second = persistClosedLoopV1Backfill(new Date("2026-09-15T12:00:00.000Z"));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.changed).toBe(false);
  });

  it("calcula o backfill sem gravar analytics", () => {
    stubStorage();
    const applied = {
      ...application,
      status: "applied" as const,
      updatedAt: "2026-09-15T03:04:24.620Z",
    };
    expect(persistApplicationWithOutcome({ application: applied, outcome }).ok).toBe(true);
    const before = window.localStorage.getItem(APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY);
    const computed = computeClosedLoopV1Backfill(new Date("2026-09-15T12:00:00.000Z"));
    expect(computed.ok).toBe(true);
    if (!computed.ok) return;
    expect(computed.changed).toBe(true);
    expect(computed.outcomes[0]?.appliedAt).toBe("2026-09-15T03:04:24.620Z");
    expect(computed.outcomes[0]?.snapshot?.overallFit).toBe(70);
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY)).toBe(before);
  });
});

describe("persistInboundResponseConfirmation", () => {
  const detection: ResponseDetection = {
    id: "detect-gmail-1",
    emailId: "gmail-1",
    applicationId: "app-1",
    companyName: "Bluelight Consulting",
    headline: "Bluelight Consulting respondeu → possível entrevista",
    matchStatus: "matched",
    matchConfidence: "high",
    matchEvidence: ["domínio do remetente relacionado a Bluelight Consulting"],
    classification: "interview",
    classificationConfidence: "high",
    classificationEvidence: ["texto contém convite ou menção explícita a entrevista"],
    suggestedStatus: "screening",
    fromStatus: "applied",
    pipelineChange: true,
    state: "pending_review",
    detectedAt: "2026-09-15T18:00:00.000Z",
    receivedAt: "2026-09-15T18:00:00.000Z",
    senderDomain: "bluelightconsulting.com",
    autoApply: false,
    reviewRequired: true,
  };

  it("does not change status until confirm is called, then records screening and an event", () => {
    stubStorage();
    const applied = { ...application, status: "applied" as const, companyName: "Bluelight Consulting" };
    expect(persistApplicationWithOutcome({ application: applied, outcome }).ok).toBe(true);
    expect(persistApplicationSubmitted(applied).ok).toBe(true);

    const before = JSON.parse(window.localStorage.getItem(APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY)!) as {
      events: { type: string }[];
    };
    expect(before.events.some((item) => item.type === "screening")).toBe(false);

    const confirmed = persistInboundResponseConfirmation({
      application: { ...applied, status: "applied" },
      detection,
      now: new Date("2026-09-15T18:30:00.000Z"),
    });
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.application.status).toBe("interview");
    expect(confirmed.unchanged).toBe(false);
    expect(confirmed.detection.state).toBe("confirmed");

    const analytics = JSON.parse(window.localStorage.getItem(APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY)!) as {
      outcomes: { finalStatus?: string; screeningAt?: string; snapshot?: { overallFit: number } }[];
      events: { type: string; source?: string; notes?: string }[];
    };
    expect(analytics.outcomes[0]?.finalStatus).toBe("screening");
    expect(analytics.outcomes[0]?.screeningAt).toBe("2026-09-15T18:30:00.000Z");
    expect(analytics.outcomes[0]?.snapshot?.overallFit).toBe(70);
    expect(analytics.events.some((item) => item.type === "screening" && item.source === "user")).toBe(true);
    expect(analytics.events.some((item) => item.notes?.includes("Sem envio de e-mail"))).toBe(true);

    const repeat = persistInboundResponseConfirmation({
      application: confirmed.application,
      detection: confirmed.detection,
      now: new Date("2026-09-15T19:00:00.000Z"),
    });
    expect(repeat.ok).toBe(true);
    if (!repeat.ok) return;
    expect(repeat.unchanged).toBe(true);
    const after = JSON.parse(window.localStorage.getItem(APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY)!) as {
      events: { type: string }[];
    };
    expect(after.events.filter((item) => item.type === "screening")).toHaveLength(1);
  });

  it("records a note without changing stage for ACK and dismiss does not touch the application", () => {
    stubStorage();
    const applied = { ...application, status: "applied" as const };
    expect(persistApplicationWithOutcome({ application: applied, outcome }).ok).toBe(true);
    const submitted = persistApplicationSubmitted(applied);
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    const ack: ResponseDetection = {
      ...detection,
      classification: "application_acknowledged",
      headline: "Bluelight Consulting confirmou a candidatura",
      suggestedStatus: null,
      pipelineChange: false,
      classificationEvidence: ["texto confirma receção da candidatura, sem convite de entrevista"],
    };
    const confirmed = persistInboundResponseConfirmation({
      application: submitted.application,
      detection: ack,
      now: new Date("2026-09-15T19:00:00.000Z"),
    });
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.unchanged).toBe(true);
    expect(confirmed.application.status).toBe("applied");

    const dismissed = persistInboundResponseDismissal({
      ...detection,
      id: "detect-dismiss",
      emailId: "gmail-dismiss",
      state: "pending_review",
    });
    expect(dismissed.ok).toBe(true);
    expect(submitted.application.status).toBe("applied");
    expect(window.localStorage.getItem(APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY)).toContain("dismissed");
  });
});
