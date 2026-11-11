// @vitest-environment jsdom
/**
 * Deterministic local smoke for Manual Application F1.
 * Evidence class: TEST VERIFIED (not PREVIEW VERIFIED).
 * Does not open real ATS portals or mutate Production data.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { ApplyFlowJob } from "@devflow/applyflow-core";

import {
  JOB_QUEUE_IGNORE_LABEL,
  MANUAL_APPLICATION_CONFIRM_BLOCKED,
  MANUAL_APPLICATION_CONFIRM_PROMPT,
  MANUAL_APPLICATION_DISCLOSURE,
  MANUAL_APPLICATION_MARK_ERROR,
  MANUAL_APPLICATION_PACK_RECORD_HINT,
} from "./job-inbox-content";
import { ManualApplicationAction } from "./manual-application-action";
import { JobInboxPanel } from "./job-inbox-panel";

afterEach(() => {
  cleanup();
});

function reviewingJob(overrides: Partial<ApplyFlowJob> = {}): ApplyFlowJob {
  return {
    id: "job_smoke_1",
    title: "Synthetic Engineer",
    company: "Local Harness",
    source: "paste",
    status: "reviewing",
    url: "https://example.com/jobs/synthetic-1",
    jobContext: { skills: ["TypeScript"] },
    jobMatch: {
      score: 80,
      decision: "apply",
      matchedSkills: ["TypeScript"],
      missingSkills: [],
      evaluatedAt: "2026-11-11T12:00:00.000Z",
      scoringVersion: "v1",
    },
    createdAt: "2026-11-11T12:00:00.000Z",
    updatedAt: "2026-11-11T12:00:00.000Z",
    ...overrides,
  };
}

describe("Manual Application F1 local smoke (TEST VERIFIED)", () => {
  it("Scenario 1 — open and defer keeps reviewing with no mutation", () => {
    const onMarkJobApplied = vi.fn();
    const openUrl = vi.fn(() => true);
    const job = reviewingJob();
    render(<ManualApplicationAction job={job} onMarkJobApplied={onMarkJobApplied} openUrl={openUrl} />);

    expect(screen.getByText(MANUAL_APPLICATION_DISCLOSURE)).toBeTruthy();
    fireEvent.click(screen.getByTestId("manual-app-open-job_smoke_1"));
    expect(openUrl).toHaveBeenCalledWith("https://example.com/jobs/synthetic-1");
    expect(onMarkJobApplied).not.toHaveBeenCalled();
    expect(screen.getByText(MANUAL_APPLICATION_CONFIRM_PROMPT)).toBeTruthy();

    fireEvent.click(screen.getByTestId("manual-app-confirm-later-job_smoke_1"));
    expect(onMarkJobApplied).not.toHaveBeenCalled();
    expect(screen.queryByTestId("manual-app-confirm-job_smoke_1")).toBeNull();
    expect(job.status).toBe("reviewing");
  });

  it("Scenario 2 — blocked application keeps reviewing with no mutation", () => {
    const onMarkJobApplied = vi.fn();
    render(
      <ManualApplicationAction job={reviewingJob()} onMarkJobApplied={onMarkJobApplied} openUrl={() => true} />,
    );
    fireEvent.click(screen.getByTestId("manual-app-open-job_smoke_1"));
    expect(screen.getByText(MANUAL_APPLICATION_CONFIRM_BLOCKED)).toBeTruthy();
    fireEvent.click(screen.getByTestId("manual-app-confirm-blocked-job_smoke_1"));
    expect(onMarkJobApplied).not.toHaveBeenCalled();
    expect(screen.queryByTestId("manual-app-confirm-job_smoke_1")).toBeNull();
  });

  it("Scenario 3 — explicit confirm calls mutation once and stays coherent on success", async () => {
    const onMarkJobApplied = vi.fn(async () => undefined);
    render(
      <ManualApplicationAction
        job={reviewingJob()}
        onMarkJobApplied={onMarkJobApplied}
        openUrl={() => true}
        confirmFn={() => true}
      />,
    );
    fireEvent.click(screen.getByTestId("manual-app-open-job_smoke_1"));
    fireEvent.click(screen.getByTestId("manual-app-confirm-yes-job_smoke_1"));
    fireEvent.click(screen.getByTestId("manual-app-confirm-yes-job_smoke_1"));
    await waitFor(() => expect(onMarkJobApplied).toHaveBeenCalledTimes(1));
    expect(onMarkJobApplied).toHaveBeenCalledWith("job_smoke_1");
  });

  it("Scenario 4 — OCC/network rejection shows error without false applied UI", async () => {
    const onMarkJobApplied = vi.fn(async () => {
      throw new Error("version_conflict");
    });
    const job = reviewingJob();
    render(
      <ManualApplicationAction
        job={job}
        onMarkJobApplied={onMarkJobApplied}
        openUrl={() => true}
        confirmFn={() => true}
      />,
    );
    fireEvent.click(screen.getByTestId("manual-app-open-job_smoke_1"));
    fireEvent.click(screen.getByTestId("manual-app-confirm-yes-job_smoke_1"));
    await waitFor(() => expect(screen.getByTestId("manual-app-error-job_smoke_1")).toBeTruthy());
    expect(screen.getByText(MANUAL_APPLICATION_MARK_ERROR)).toBeTruthy();
    expect(job.status).toBe("reviewing");
    expect(screen.getByTestId("manual-app-confirm-yes-job_smoke_1")).toBeTruthy();
  });

  it("Scenario 5 — pack no longer fires unhandled mark-applied; ignore CTA still present", () => {
    const packed = reviewingJob({
      id: "job_smoke_pack",
      applicationPack: {
        version: 1,
        packVersion: "application-pack-v1",
        createdAt: "2026-11-11T12:00:00.000Z",
        updatedAt: "2026-11-11T12:00:00.000Z",
        jobId: "job_smoke_pack",
        resume: { variantId: "rv1", variantName: "Primary", recommendedByRouter: false },
        match: {
          score: 80,
          decision: "apply",
          matchedSkills: ["TypeScript"],
          missingSkills: [],
          scoringVersion: "v1",
        },
        highlights: ["TypeScript"],
        gaps: [],
        candidateFacts: { name: "Test", location: "BR", englishLevel: "C1", answerBank: {} },
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
    const html = renderToStaticMarkup(
      <JobInboxPanel
        jobs={[packed]}
        error={null}
        onEvaluatePaste={() => undefined}
        onIgnoreJob={() => undefined}
        onMarkJobApplied={() => undefined}
      />,
    );
    expect(html).toContain(MANUAL_APPLICATION_PACK_RECORD_HINT);
    expect(html).not.toContain(`application-pack-mark-applied-${packed.id}`);
    expect(html).toContain(JOB_QUEUE_IGNORE_LABEL);
    expect(html).toContain(`manual-app-open-${packed.id}`);
    expect(html).toContain(MANUAL_APPLICATION_DISCLOSURE);
  });

  it("Scenario 5b — already applied hides manual CTA", () => {
    const { container } = render(
      <ManualApplicationAction job={reviewingJob({ status: "applied" })} onMarkJobApplied={vi.fn()} />,
    );
    expect(container.textContent).toBe("");
  });
});
