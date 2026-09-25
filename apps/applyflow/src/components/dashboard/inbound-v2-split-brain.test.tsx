// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ApplyFlowJob, ResponseDetection } from "@devflow/applyflow-core";

import { InboundApplicationResponsePanel } from "./inbound-application-response-panel";
import { INBOUND_RESPONSE_V2_CONFIRM_BLOCKED } from "./inbound-application-response-content";
import {
  assessDashboardMigrationGate,
  localV1DashboardHasLegacyData,
} from "@/lib/persistence-v2/dashboard/dashboard-persistence";
import { APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY, persistDashboardJobs } from "@/lib/local-job-storage";
import { APPLYFLOW_DASHBOARD_STORAGE_KEY } from "@/lib/local-import-storage";
import { APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY } from "@/lib/local-inbound-response-storage";

const job: ApplyFlowJob = {
  id: "job_linked",
  title: "Senior Product Engineer",
  company: "Bluelight Consulting",
  source: "paste",
  status: "applied",
  jobContext: { skills: ["React"] },
  jobMatch: {
    score: 80,
    decision: "apply",
    matchedSkills: ["React"],
    missingSkills: [],
    evaluatedAt: "2026-09-15T12:00:00.000Z",
    scoringVersion: "v1",
  },
  createdAt: "2026-09-15T12:00:00.000Z",
  updatedAt: "2026-09-15T12:00:00.000Z",
};

const application = {
  id: "app-inbound",
  createdAt: "2026-09-15T12:00:00.000Z",
  updatedAt: "2026-09-15T12:00:00.000Z",
  source: "paste" as const,
  status: "applied" as const,
  companyName: "Bluelight Consulting",
  jobTitle: "Senior Product Engineer",
  v2: { sourceJobId: "job_linked" },
};

const detection: ResponseDetection = {
  id: "detect-v2-split",
  emailId: "gmail-v2-split",
  applicationId: "app-inbound",
  companyName: "Bluelight Consulting",
  jobTitle: "Senior Product Engineer",
  headline: "Bluelight Consulting respondeu",
  matchStatus: "matched",
  matchConfidence: "high",
  matchEvidence: ["domínio do remetente"],
  classification: "interview",
  classificationConfidence: "high",
  classificationEvidence: ["entrevista"],
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

function seedDetection() {
  window.localStorage.setItem(
    APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      savedAt: "2026-09-15T18:00:00.000Z",
      detections: [detection],
    }),
  );
}

function clickConfirm() {
  fireEvent.click(screen.getByTestId("inbound-response-confirm-detect-v2-split"));
}

describe("inbound confirmation persistence boundary", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("keeps the V1 local confirmation path, including the linked job", () => {
    persistDashboardJobs([job]);
    seedDetection();
    const onApplicationUpdated = vi.fn();
    render(
      <InboundApplicationResponsePanel
        applications={[application]}
        onApplicationUpdated={onApplicationUpdated}
      />,
    );

    clickConfirm();

    const storedApplications = JSON.parse(window.localStorage.getItem(APPLYFLOW_DASHBOARD_STORAGE_KEY) ?? "null") as {
      version: number;
      applications: { status: string }[];
    };
    const storedJobs = JSON.parse(window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY) ?? "null") as {
      version: number;
      jobs: { status: string }[];
    };
    expect(storedApplications.version).toBe(1);
    expect(storedApplications.applications[0]?.status).toBe("interview");
    expect(storedJobs.version).toBe(1);
    expect(storedJobs.jobs[0]?.status).toBe("interview");
    expect(onApplicationUpdated).toHaveBeenCalledWith(expect.objectContaining({ status: "interview" }));
    const detections = JSON.parse(window.localStorage.getItem(APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY) ?? "null") as {
      detections: { state: string }[];
    };
    expect(detections.detections[0]?.state).toBe("confirmed");
  });

  it("does not write canonical V1 job or application storage when V2 confirmation is blocked", () => {
    persistDashboardJobs([job]);
    seedDetection();
    const jobsBefore = window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY);
    const detectionsBefore = window.localStorage.getItem(APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY);
    const onApplicationUpdated = vi.fn();
    render(
      <InboundApplicationResponsePanel
        applications={[application]}
        persistenceV2Enabled
        onApplicationUpdated={onApplicationUpdated}
      />,
    );

    clickConfirm();

    expect(screen.getByText(INBOUND_RESPONSE_V2_CONFIRM_BLOCKED)).toBeTruthy();
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY)).toBe(jobsBefore);
    expect(window.localStorage.getItem(APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY)).toBe(detectionsBefore);
    expect(onApplicationUpdated).not.toHaveBeenCalled();
  });

  it("does not manufacture migration_required from an empty V2 inbox", () => {
    seedDetection();
    render(
      <InboundApplicationResponsePanel
        applications={[application]}
        persistenceV2Enabled
      />,
    );

    clickConfirm();

    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY)).toBeNull();
    expect(localV1DashboardHasLegacyData()).toBe(false);
    expect(
      assessDashboardMigrationGate({
        mode: "v2",
        legacyData: localV1DashboardHasLegacyData(),
        migration: { v1ToV2Complete: false },
      }),
    ).toBe("v2_ready");
  });
});
