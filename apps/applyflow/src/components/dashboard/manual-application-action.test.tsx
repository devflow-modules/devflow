// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApplyFlowJob } from "@devflow/applyflow-core";

import {
  MANUAL_APPLICATION_CONFIRM_BLOCKED,
  MANUAL_APPLICATION_CONFIRM_LATER,
  MANUAL_APPLICATION_CONFIRM_PROMPT,
  MANUAL_APPLICATION_CTA_ATS_JOB_LABEL,
  MANUAL_APPLICATION_CTA_LISTING_LABEL,
  MANUAL_APPLICATION_DISCLOSURE,
  MANUAL_APPLICATION_MARK_ERROR,
} from "./job-inbox-content";
import { ManualApplicationAction } from "./manual-application-action";

afterEach(() => {
  cleanup();
});

function baseJob(overrides: Partial<ApplyFlowJob> = {}): ApplyFlowJob {
  return {
    id: "job_manual_1",
    title: "Backend Engineer",
    company: "Acme",
    source: "paste",
    status: "reviewing",
    url: "https://remoteok.com/remote-jobs/1",
    jobContext: { skills: ["React"] },
    jobMatch: {
      score: 70,
      decision: "stretch",
      matchedSkills: ["React"],
      missingSkills: [],
      evaluatedAt: "2026-08-13T12:00:00.000Z",
      scoringVersion: "v1",
    },
    createdAt: "2026-08-13T12:00:00.000Z",
    updatedAt: "2026-08-13T12:00:00.000Z",
    ...overrides,
  };
}

describe("ManualApplicationAction", () => {
  it("shows listing CTA and disclosure without mutating status on open", () => {
    const onMarkJobApplied = vi.fn();
    const openUrl = vi.fn(() => true);
    render(<ManualApplicationAction job={baseJob()} onMarkJobApplied={onMarkJobApplied} openUrl={openUrl} />);

    expect(screen.getByText(MANUAL_APPLICATION_DISCLOSURE)).toBeTruthy();
    const openButton = screen.getByTestId("manual-app-open-job_manual_1");
    expect(openButton.textContent).toBe(MANUAL_APPLICATION_CTA_LISTING_LABEL);
    expect(openButton.getAttribute("data-cta-kind")).toBe("listing");

    fireEvent.click(openButton);
    expect(openUrl).toHaveBeenCalledWith("https://remoteok.com/remote-jobs/1");
    expect(onMarkJobApplied).not.toHaveBeenCalled();
    expect(screen.getByTestId("manual-app-confirm-job_manual_1")).toBeTruthy();
    expect(screen.getByText(MANUAL_APPLICATION_CONFIRM_PROMPT)).toBeTruthy();
  });

  it("shows ATS portal CTA for known ATS job page URL", () => {
    render(
      <ManualApplicationAction
        job={baseJob({ url: "https://jobs.ashbyhq.com/acme/abc", source: "paste" })}
        openUrl={() => true}
      />,
    );
    const openButton = screen.getByTestId("manual-app-open-job_manual_1");
    expect(openButton.textContent).toBe(MANUAL_APPLICATION_CTA_ATS_JOB_LABEL);
    expect(openButton.getAttribute("data-cta-kind")).toBe("ats_job");
  });

  it("keeps reviewing for Não consegui enviar without mutation", () => {
    const onMarkJobApplied = vi.fn();
    render(
      <ManualApplicationAction job={baseJob()} onMarkJobApplied={onMarkJobApplied} openUrl={() => true} />,
    );
    fireEvent.click(screen.getByTestId("manual-app-open-job_manual_1"));
    expect(screen.getByText(MANUAL_APPLICATION_CONFIRM_BLOCKED)).toBeTruthy();
    fireEvent.click(screen.getByTestId("manual-app-confirm-blocked-job_manual_1"));
    expect(onMarkJobApplied).not.toHaveBeenCalled();
    expect(screen.queryByTestId("manual-app-confirm-job_manual_1")).toBeNull();
    expect(screen.getByTestId("manual-app-open-job_manual_1")).toBeTruthy();
  });

  it("keeps reviewing for Vou continuar depois without mutation", () => {
    const onMarkJobApplied = vi.fn();
    render(
      <ManualApplicationAction job={baseJob()} onMarkJobApplied={onMarkJobApplied} openUrl={() => true} />,
    );
    fireEvent.click(screen.getByTestId("manual-app-open-job_manual_1"));
    expect(screen.getByText(MANUAL_APPLICATION_CONFIRM_LATER)).toBeTruthy();
    fireEvent.click(screen.getByTestId("manual-app-confirm-later-job_manual_1"));
    expect(onMarkJobApplied).not.toHaveBeenCalled();
    expect(screen.queryByTestId("manual-app-confirm-job_manual_1")).toBeNull();
    expect(screen.getByTestId("manual-app-open-job_manual_1")).toBeTruthy();
  });

  it("requires explicit final confirm before calling mark applied once", async () => {
    const onMarkJobApplied = vi.fn(async () => undefined);
    const confirmFn = vi.fn(() => true);
    render(
      <ManualApplicationAction
        job={baseJob()}
        onMarkJobApplied={onMarkJobApplied}
        openUrl={() => true}
        confirmFn={confirmFn}
      />,
    );
    fireEvent.click(screen.getByTestId("manual-app-open-job_manual_1"));
    fireEvent.click(screen.getByTestId("manual-app-confirm-yes-job_manual_1"));
    fireEvent.click(screen.getByTestId("manual-app-confirm-yes-job_manual_1"));

    await waitFor(() => expect(onMarkJobApplied).toHaveBeenCalledTimes(1));
    expect(onMarkJobApplied).toHaveBeenCalledWith("job_manual_1");
    expect(confirmFn).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("manual-app-confirm-job_manual_1")).toBeNull();
    expect(screen.getByTestId("manual-app-open-job_manual_1")).toBeTruthy();
  });

  it("does not call mark applied when final confirm is cancelled", async () => {
    const onMarkJobApplied = vi.fn();
    render(
      <ManualApplicationAction
        job={baseJob()}
        onMarkJobApplied={onMarkJobApplied}
        openUrl={() => true}
        confirmFn={() => false}
      />,
    );
    fireEvent.click(screen.getByTestId("manual-app-open-job_manual_1"));
    fireEvent.click(screen.getByTestId("manual-app-confirm-yes-job_manual_1"));
    await waitFor(() => expect(onMarkJobApplied).not.toHaveBeenCalled());
  });

  it("shows error without claiming applied when mutation rejects", async () => {
    const onMarkJobApplied = vi.fn(async () => {
      throw new Error("occ_conflict");
    });
    render(
      <ManualApplicationAction
        job={baseJob()}
        onMarkJobApplied={onMarkJobApplied}
        openUrl={() => true}
        confirmFn={() => true}
      />,
    );
    fireEvent.click(screen.getByTestId("manual-app-open-job_manual_1"));
    fireEvent.click(screen.getByTestId("manual-app-confirm-yes-job_manual_1"));
    await waitFor(() => expect(screen.getByTestId("manual-app-error-job_manual_1")).toBeTruthy());
    expect(screen.getByText(MANUAL_APPLICATION_MARK_ERROR)).toBeTruthy();
    expect(screen.getByTestId("manual-app-confirm-job_manual_1")).toBeTruthy();
  });

  it("hides CTA when job is already applied", () => {
    const { container } = render(
      <ManualApplicationAction job={baseJob({ status: "applied" })} onMarkJobApplied={vi.fn()} />,
    );
    expect(container.textContent).toBe("");
  });

  it("blocks open when URL is invalid", () => {
    const openUrl = vi.fn(() => true);
    render(
      <ManualApplicationAction
        job={baseJob({ url: "javascript:alert(1)" })}
        onMarkJobApplied={vi.fn()}
        openUrl={openUrl}
      />,
    );
    expect(screen.getByTestId("manual-app-unavailable-job_manual_1")).toBeTruthy();
    expect(openUrl).not.toHaveBeenCalled();
  });
});
