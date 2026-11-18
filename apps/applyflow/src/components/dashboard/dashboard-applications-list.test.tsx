// @vitest-environment jsdom
/**
 * V1 local regression: Candidaturas shows confirmed applied jobs after reload
 * even when applications[] is empty. TEST VERIFIED (not browser E2E).
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createApplicationFromJob,
  markApplyFlowJobApplied,
  type ApplyFlowApplicationV2Envelope,
  type ApplyFlowJob,
  type JobDecisionV2,
} from "@devflow/applyflow-core";

import { persistDashboardImport } from "@/lib/local-import-storage";
import { clearPersistedDashboardJobs, persistDashboardJobs } from "@/lib/local-job-storage";

import { DashboardClient } from "./dashboard-client";
import { testBootstrapV1 } from "./test-persistence-bootstrap";

const NOW = new Date("2026-11-17T15:00:00.000Z");

const decision: JobDecisionV2 = {
  scoringVersion: "v2",
  decision: "apply_normal",
  overall: 71,
  dimensions: {
    overall: 71,
    coreEngineering: 71,
    stack: 100,
    specialization: 100,
    seniority: 40,
    product: 100,
  },
  confidence: "medium",
  hiringProbability: "medium",
  careerUpside: "medium",
  applicationCost: "medium",
  opportunityCost: "low",
  eliminationRisk: "low",
  priority: 70,
  matches: [],
  claims: [],
  recommendedClaims: [],
  gates: [],
  candidateInputRequests: [],
  reasons: ["fixture"],
};

function baseJob(overrides: Partial<ApplyFlowJob> & Pick<ApplyFlowJob, "id">): ApplyFlowJob {
  return {
    id: overrides.id,
    title: overrides.title ?? "Role",
    company: overrides.company ?? "Company",
    url: overrides.url ?? `https://example.com/jobs/${overrides.id}`,
    source: overrides.source ?? "paste",
    status: overrides.status ?? "reviewing",
    jobContext: overrides.jobContext ?? { skills: ["TypeScript"] },
    jobMatch: overrides.jobMatch ?? {
      score: 70,
      decision: "apply",
      matchedSkills: ["TypeScript"],
      missingSkills: [],
      evaluatedAt: NOW.toISOString(),
      scoringVersion: "v1",
    },
    createdAt: overrides.createdAt ?? NOW.toISOString(),
    updatedAt: overrides.updatedAt ?? NOW.toISOString(),
  };
}

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("min-width: 768px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  cleanup();
  clearPersistedDashboardJobs();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("DashboardClient Candidaturas list (V1 local)", () => {
  it("after Sim, enviei + reload: applied job without Application appears once", async () => {
    const reviewing = baseJob({
      id: "job_sim_enviei",
      company: "Local Harness",
      title: "Synthetic Engineer",
      status: "reviewing",
    });
    const applied = markApplyFlowJobApplied(reviewing, NOW);
    persistDashboardJobs([applied]);
    persistDashboardImport([]);

    const first = render(
      <DashboardClient persistenceBootstrap={testBootstrapV1} workspace="applications" />,
    );
    expect(await screen.findByText("Local Harness")).toBeTruthy();
    expect(screen.getByText(/1 candidatura registrada/)).toBeTruthy();
    expect(screen.queryByText("Ainda sem candidaturas")).toBeNull();
    expect(screen.getAllByText("Synthetic Engineer")).toHaveLength(1);
    first.unmount();

    // Reload: remount from the same localStorage — still one row, no write of Application.
    render(<DashboardClient persistenceBootstrap={testBootstrapV1} workspace="applications" />);
    expect(await screen.findByText("Local Harness")).toBeTruthy();
    expect(screen.getByText(/1 candidatura registrada/)).toBeTruthy();
    expect(screen.getAllByText("Synthetic Engineer")).toHaveLength(1);
    expect(screen.getByTestId("application-row-derived-applied-job")).toBeTruthy();
  });

  it("mixed Wagmo/Oowlish/Stefanini fixtures: one row each for confirmed sends only", async () => {
    const wagmo = baseJob({
      id: "job_ro_1137572",
      company: "Wagmo",
      title: "Senior Software Engineer LATAM",
      status: "applied",
      source: "remoteok",
      url: "https://remoteok.com/remote-jobs/job_ro_1137572",
    });
    const stefanini = baseJob({
      id: "job_mwfici36_z7n3et9k",
      company: "Stefanini Brasil",
      title: "Desenvolvedor Full Stack Sr",
      status: "reviewing",
      url: "https://stefanini.gupy.io/candidates/jobs/12825537/apply",
    });
    const oowlishJob = baseJob({
      id: "job_oowlish",
      company: "Oowlish",
      title: "Senior Software Engineer",
      status: "applied",
      url: "https://example.com/oowlish",
    });
    const oowlishApp: ApplyFlowApplicationV2Envelope = {
      ...createApplicationFromJob({
        job: { ...oowlishJob, status: "reviewing" },
        decision,
        now: NOW,
      }).application,
      status: "applied",
      appliedAt: "2026-11-10T18:00:00.000Z",
    };

    persistDashboardJobs([wagmo, stefanini, oowlishJob]);
    persistDashboardImport([oowlishApp]);

    render(<DashboardClient persistenceBootstrap={testBootstrapV1} workspace="applications" />);

    await waitFor(() => {
      expect(screen.getByText(/2 candidaturas registradas/)).toBeTruthy();
    });
    expect(screen.getByText("Wagmo")).toBeTruthy();
    expect(screen.getByText("Oowlish")).toBeTruthy();
    expect(screen.queryByText("Stefanini Brasil")).toBeNull();
    expect(screen.getByTestId("application-row-derived-applied-job")).toBeTruthy();
    expect(screen.getAllByTestId("application-row").length).toBeGreaterThanOrEqual(1);
  });

  it("empty state when only reviewing jobs exist", async () => {
    persistDashboardJobs([
      baseJob({
        id: "job_mwfici36_z7n3et9k",
        company: "Stefanini Brasil",
        status: "reviewing",
      }),
    ]);
    persistDashboardImport([]);

    render(<DashboardClient persistenceBootstrap={testBootstrapV1} workspace="applications" />);
    expect(await screen.findByText("Ainda sem candidaturas")).toBeTruthy();
    expect(screen.queryByText("Stefanini Brasil")).toBeNull();
  });

  it("incomplete Application with sourceJobId reuses linked job title/company (no em dash)", async () => {
    const linked = baseJob({
      id: "job_with_app",
      company: "Persisted Co",
      title: "Backend Engineer",
      status: "applied",
    });
    const incomplete: ApplyFlowApplicationV2Envelope = {
      id: "app_persisted",
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      source: "paste",
      status: "applied",
      appliedAt: NOW.toISOString(),
      // Historical bad fixture used role/company instead of jobTitle/companyName.
      v2: { sourceJobId: "job_with_app" },
    };
    const legacyApplied = baseJob({
      id: "job_legacy_applied",
      company: "Legacy Corp",
      title: "Legacy Applied Engineer",
      status: "applied",
    });

    persistDashboardJobs([linked, legacyApplied]);
    persistDashboardImport([incomplete]);

    render(<DashboardClient persistenceBootstrap={testBootstrapV1} workspace="applications" />);

    await waitFor(() => {
      expect(screen.getByText(/2 candidaturas registradas/)).toBeTruthy();
    });
    expect(screen.getByText("Backend Engineer")).toBeTruthy();
    expect(screen.getByText("Persisted Co")).toBeTruthy();
    expect(screen.getByText("Legacy Applied Engineer")).toBeTruthy();
    expect(screen.getByText("Legacy Corp")).toBeTruthy();
    expect(screen.queryByText("Cargo não informado")).toBeNull();
    expect(screen.queryByText("Empresa não informada")).toBeNull();
    expect(screen.getByTestId("application-row")).toBeTruthy();
    expect(screen.getByTestId("application-row-derived-applied-job")).toBeTruthy();
  });
});
