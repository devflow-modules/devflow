/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ApplyFlowJob } from "@devflow/applyflow-core";

import { JobInboxPanel } from "./job-inbox-panel";
import {
  JOB_QUEUE_FIT_LABEL,
  JOB_QUEUE_NEXT_ACTION_LABEL,
  JOB_QUEUE_STAGE_LABEL,
} from "./job-inbox-content";
import {
  OPPORTUNITY_QUEUE_NAV_STORAGE_KEY,
  markOpportunityQueueAnchor,
  saveOpportunityQueueFilters,
} from "@/lib/opportunity-queue-nav-state";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

beforeEach(() => {
  window.sessionStorage.clear();
});

function reviewingJob(overrides: Partial<ApplyFlowJob> = {}): ApplyFlowJob {
  return {
    id: "job_queue_nav_1",
    title: "Staff Backend Engineer",
    company: "Queue Co",
    source: "paste",
    status: "reviewing",
    url: "https://example.test/jobs/1",
    jobContext: { skills: ["React"] },
    jobMatch: {
      score: 71,
      decision: "stretch",
      matchedSkills: ["React"],
      missingSkills: [],
      evaluatedAt: "2026-11-18T12:00:00.000Z",
      scoringVersion: "v1",
    },
    createdAt: "2026-11-18T12:00:00.000Z",
    updatedAt: "2026-11-18T12:00:00.000Z",
    ...overrides,
  };
}

describe("Oportunidades queue navigation context", () => {
  it("renders dense cards with stage, fit, and next action separated", () => {
    render(
      <JobInboxPanel
        focus="queue"
        jobs={[reviewingJob()]}
        error={null}
        onEvaluatePaste={() => undefined}
        onIgnoreJob={() => undefined}
      />,
    );
    expect(screen.getByText("Staff Backend Engineer")).toBeTruthy();
    expect(screen.getByText("Queue Co")).toBeTruthy();
    expect(screen.getByText(JOB_QUEUE_STAGE_LABEL)).toBeTruthy();
    expect(screen.getByText(JOB_QUEUE_FIT_LABEL)).toBeTruthy();
    expect(screen.getByText(JOB_QUEUE_NEXT_ACTION_LABEL, { exact: false })).toBeTruthy();
    expect(screen.queryByText(/Networking:/i)).toBeNull();
  });

  it("restores saved filters when returning to the queue", async () => {
    saveOpportunityQueueFilters({
      view: "all",
      sort: "recency",
      decision: "stretch",
      source: "paste",
    });
    markOpportunityQueueAnchor("job_queue_nav_1");

    render(
      <JobInboxPanel
        focus="queue"
        jobs={[reviewingJob()]}
        error={null}
        onEvaluatePaste={() => undefined}
      />,
    );

    await waitFor(() => {
      expect((screen.getByTestId("job-queue-sort") as HTMLSelectElement).value).toBe("recency");
      expect((screen.getByTestId("job-queue-filter-decision") as HTMLSelectElement).value).toBe("stretch");
      expect((screen.getByTestId("job-queue-filter-source") as HTMLSelectElement).value).toBe("paste");
    });
    expect(window.sessionStorage.getItem(OPPORTUNITY_QUEUE_NAV_STORAGE_KEY)).toBeTruthy();
  });

  it("keeps saved Application Pack openable on dense queue cards", () => {
    const packed = reviewingJob({
      id: "job_queue_nav_packed",
      applicationPack: {
        version: 1,
        packVersion: "application-pack-v1",
        createdAt: "2026-11-18T12:00:00.000Z",
        updatedAt: "2026-11-18T12:00:00.000Z",
        jobId: "job_queue_nav_packed",
        resume: { variantId: "rv_1", variantName: "Perfil principal", recommendedByRouter: false },
        match: {
          score: 71,
          decision: "stretch",
          matchedSkills: ["React"],
          missingSkills: [],
          scoringVersion: "v1",
        },
        highlights: ["React"],
        gaps: [],
        candidateFacts: { name: "Fixture" },
        checklist: [
          { id: "review-resume", done: false },
          { id: "review-highlights", done: false },
          { id: "review-gaps", done: false },
          { id: "review-answers", done: false },
          { id: "open-job", done: false },
          { id: "mark-applied", done: false },
        ],
      },
    });
    render(
      <JobInboxPanel
        focus="queue"
        jobs={[packed]}
        error={null}
        onEvaluatePaste={() => undefined}
        onIgnoreJob={() => undefined}
      />,
    );
    expect(screen.getByTestId("application-pack-open-job_queue_nav_packed")).toBeTruthy();
  });
});
