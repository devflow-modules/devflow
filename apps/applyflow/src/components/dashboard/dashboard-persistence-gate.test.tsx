// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

import { APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY, persistDashboardJobs } from "@/lib/local-job-storage";
import type { ApplyFlowJob } from "@devflow/applyflow-core";

import { fingerprintApplyFlowAccountId } from "@/lib/persistence-v2/migration/migration-fingerprint";
import { APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY } from "@/lib/persistence-v2/migration/migration-marker";
import { prepareMigrationBundle } from "@/lib/persistence-v2/migration/migration-prepare";

import { DashboardClient } from "./dashboard-client";

const ACCOUNT_ID = "acc-ui-gate-1";

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

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("DashboardClient persistence gate", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("shows migration required and preserves local jobs when V2 is on", async () => {
    persistDashboardJobs([job]);
    const raw = window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY);
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/me")) {
        return jsonResponse(200, { authenticated: true, account: { id: ACCOUNT_ID } });
      }
      return jsonResponse(500, { error: "unexpected" });
    });
    vi.stubGlobal("fetch", fetchImpl);
    render(<DashboardClient persistenceV2Enabled />);
    expect(await screen.findByText("Migração necessária")).toBeTruthy();
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/applyflow/v2/me",
      expect.objectContaining({ method: "GET" }),
    );
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

  it("unlocks with a valid marker without deleting V1 jobs", async () => {
    persistDashboardJobs([job]);
    const raw = window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY);
    const prep = prepareMigrationBundle();
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    window.localStorage.setItem(
      APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        v1ToV2Complete: true,
        accountIdFingerprint: fingerprintApplyFlowAccountId(ACCOUNT_ID),
        sessionId: "session_ui_1",
        completedAt: "2026-09-25T20:00:00.000Z",
        fingerprint: prep.bundle.fingerprint,
      }),
    );
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return jsonResponse(200, { authenticated: true, account: { id: ACCOUNT_ID } });
      }
      if (url.endsWith("/jobs")) return jsonResponse(200, { jobs: [] });
      if (url.endsWith("/applications")) return jsonResponse(200, { applications: [] });
      return jsonResponse(500, { error: "unexpected" });
    });
    vi.stubGlobal("fetch", fetchImpl);
    render(<DashboardClient persistenceV2Enabled />);
    await waitFor(() => {
      expect(screen.queryByText("Migração necessária")).toBeNull();
      expect(screen.queryByText("Entre na conta para continuar")).toBeNull();
    });
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY)).toBe(raw);
  });
});
