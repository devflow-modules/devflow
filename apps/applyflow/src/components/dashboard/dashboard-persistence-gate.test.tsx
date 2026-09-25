// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

import { APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY, persistDashboardJobs } from "@/lib/local-job-storage";
import type { ApplyFlowJob } from "@devflow/applyflow-core";

import { DashboardClient } from "./dashboard-client";

const job: ApplyFlowJob = {
  id: "job_legacy",
  title: "Legacy Role",
  source: "paste",
  status: "reviewing",
  jobContext: { skills: ["React"] },
  jobMatch: {
    score: 80,
    decision: "apply",
    matchedSkills: ["React"],
    missingSkills: [],
    evaluatedAt: "2026-09-25T12:00:00.000Z",
    scoringVersion: "v1",
  },
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
};

describe("DashboardClient persistence gate", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("shows migration required and preserves local jobs when V2 is on", async () => {
    persistDashboardJobs([job]);
    const raw = window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY);
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    render(<DashboardClient persistenceV2Enabled />);
    expect(await screen.findByText("Migração necessária")).toBeTruthy();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY)).toBe(raw);
  });

  it("does not require authentication while V2 is off", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    render(<DashboardClient persistenceV2Enabled={false} />);
    await waitFor(() => {
      expect(screen.queryByText("A preparar o painel e ler o armazenamento local…")).toBeNull();
    });
    expect(screen.queryByText("Entre na conta para continuar")).toBeNull();
    expect(screen.queryByText("Migração necessária")).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
