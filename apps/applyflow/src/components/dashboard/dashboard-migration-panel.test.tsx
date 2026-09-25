// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY, persistDashboardJobs } from "@/lib/local-job-storage";
import { APPLYFLOW_DASHBOARD_STORAGE_KEY, persistDashboardImport } from "@/lib/local-import-storage";
import type { ApplyFlowApplicationV2Envelope, ApplyFlowJob } from "@devflow/applyflow-core";

import { fingerprintApplyFlowAccountId } from "@/lib/persistence-v2/migration/migration-fingerprint";
import {
  APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY,
  loadMigrationMarker,
} from "@/lib/persistence-v2/migration/migration-marker";
import { prepareMigrationBundle } from "@/lib/persistence-v2/migration/migration-prepare";
import * as coordinator from "@/lib/persistence-v2/migration/migration-coordinator";

import { DashboardMigrationPanel } from "./dashboard-migration-panel";
import { DashboardClient } from "./dashboard-client";

const ACCOUNT_ID = "acc-migration-ux-1";

const job: ApplyFlowJob = {
  id: "job_ux_1",
  title: "UX Role",
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

const application: ApplyFlowApplicationV2Envelope = {
  id: "app_ux_1",
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
  source: "paste",
  status: "reviewing",
  jobTitle: "UX Role",
  companyName: "Acme",
  v2: { sourceJobId: "job_ux_1" },
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function seedLegacy() {
  persistDashboardJobs([job]);
  persistDashboardImport([application]);
}

describe("DashboardMigrationPanel", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("renders migration UI with counts and requires explicit action", async () => {
    seedLegacy();
    const onComplete = vi.fn();
    render(<DashboardMigrationPanel onComplete={onComplete} />);
    expect(await screen.findByText("Migrar dados para a conta")).toBeTruthy();
    expect(screen.getByText(/Vagas detectadas:/)).toBeTruthy();
    expect(screen.getByText(/Candidaturas detectadas:/)).toBeTruthy();
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: "Migrar dados para V2" })).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
    expect(loadMigrationMarker(ACCOUNT_ID)).toBeNull();
  });

  it("shows preparing then migrating and calls coordinator once", async () => {
    seedLegacy();
    const runSpy = vi.spyOn(coordinator, "runMigration").mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 30));
      return {
        ok: true,
        state: "completed",
        empty: true,
      };
    });
    const onComplete = vi.fn();
    render(<DashboardMigrationPanel onComplete={onComplete} />);
    fireEvent.click(await screen.findByRole("button", { name: "Migrar dados para V2" }));
    expect(await screen.findByText(/A preparar a migração|A migrar dados/)).toBeTruthy();
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(runSpy).toHaveBeenCalledTimes(1);
  });

  it("protects against double-click", async () => {
    seedLegacy();
    let resolveRun: (value: coordinator.MigrationCoordinatorResult | coordinator.MigrationCoordinatorEmpty) => void =
      () => undefined;
    const runSpy = vi.spyOn(coordinator, "runMigration").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRun = resolve;
        }),
    );
    render(<DashboardMigrationPanel onComplete={vi.fn()} />);
    const button = await screen.findByRole("button", { name: "Migrar dados para V2" });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(runSpy).toHaveBeenCalledTimes(1));
    resolveRun({ ok: true, state: "completed", empty: true });
    await waitFor(() => expect(runSpy).toHaveBeenCalledTimes(1));
  });

  it("shows auth_required with login link and does not complete", async () => {
    seedLegacy();
    vi.spyOn(coordinator, "runMigration").mockResolvedValue({
      ok: false,
      state: "failed",
      code: "auth_required",
    });
    const onComplete = vi.fn();
    render(<DashboardMigrationPanel onComplete={onComplete} />);
    fireEvent.click(await screen.findByRole("button", { name: "Migrar dados para V2" }));
    expect(await screen.findByRole("link", { name: "Entrar" })).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
    expect(loadMigrationMarker(ACCOUNT_ID)).toBeNull();
  });

  it("shows dataset too large as blocked without migrate action", async () => {
    const jobs = Array.from({ length: 51 }, (_, i) => ({ ...job, id: `job_${i}` }));
    persistDashboardJobs(jobs);
    render(<DashboardMigrationPanel onComplete={vi.fn()} />);
    expect(await screen.findByText("Migração bloqueada")).toBeTruthy();
    expect(screen.getByText(/até 50 vagas e 50 candidaturas/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Migrar dados para V2" })).toBeNull();
  });

  it("shows malformed legacy blocked state", async () => {
    window.localStorage.setItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY, "{not-json");
    render(<DashboardMigrationPanel onComplete={vi.fn()} />);
    expect(await screen.findByText("Migração bloqueada")).toBeTruthy();
    expect(screen.getByText(/Não foi possível ler|incompletos ou inválidos/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Migrar dados para V2" })).toBeNull();
  });

  it("shows migration conflict summary and retry is not force-overwrite", async () => {
    seedLegacy();
    vi.spyOn(coordinator, "runMigration").mockResolvedValue({
      ok: false,
      state: "failed",
      code: "migration_conflict",
      conflicts: [{ entityType: "job", entityId: "job_ux_1", reason: "exists" }],
    });
    render(<DashboardMigrationPanel onComplete={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Migrar dados para V2" }));
    expect(await screen.findByText(/não foi finalizada/)).toBeTruthy();
    expect(screen.getByText(/não foram sobrescritos/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /sobrescrever|force/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tentar novamente" })).toBeNull();
  });

  it("shows invalid proof and offers retry via resume", async () => {
    seedLegacy();
    vi.spyOn(coordinator, "runMigration").mockResolvedValue({
      ok: false,
      state: "failed",
      code: "completion_proof_invalid",
    });
    const resumeSpy = vi.spyOn(coordinator, "resumeMigration").mockResolvedValue({
      ok: true,
      state: "completed",
      empty: true,
    });
    const onComplete = vi.fn();
    render(<DashboardMigrationPanel onComplete={onComplete} />);
    fireEvent.click(await screen.findByRole("button", { name: "Migrar dados para V2" }));
    expect(await screen.findByText(/não pôde ser validada/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(resumeSpy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it("shows marker write failure without claiming server migration failed", async () => {
    seedLegacy();
    vi.spyOn(coordinator, "runMigration").mockResolvedValue({
      ok: false,
      state: "failed",
      code: "marker_write_failed",
      detail: "session_x",
    });
    render(<DashboardMigrationPanel onComplete={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Migrar dados para V2" }));
    expect(await screen.findByText(/foi concluída, mas o navegador não confirmou/)).toBeTruthy();
    expect(screen.getByText(/migração no servidor não falhou/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeTruthy();
  });

  it("does not write the migration marker from the UI layer", async () => {
    seedLegacy();
    const jobsKey = window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY);
    const appsKey = window.localStorage.getItem(APPLYFLOW_DASHBOARD_STORAGE_KEY);
    vi.spyOn(coordinator, "runMigration").mockResolvedValue({
      ok: false,
      state: "failed",
      code: "migration_api_failed",
    });
    render(<DashboardMigrationPanel onComplete={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Migrar dados para V2" }));
    await screen.findByText(/Não foi possível concluir a migração/);
    expect(window.localStorage.getItem(APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY)).toBe(jobsKey);
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_STORAGE_KEY)).toBe(appsKey);
  });
});

describe("DashboardClient migration cutover", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("shows migration panel for migration_required", async () => {
    seedLegacy();
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/me")) {
        return jsonResponse(200, { authenticated: true, account: { id: ACCOUNT_ID } });
      }
      return jsonResponse(500, { error: "unexpected" });
    });
    vi.stubGlobal("fetch", fetchImpl);
    render(<DashboardClient persistenceV2Enabled />);
    expect(await screen.findByText("Migrar dados para a conta")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Migrar dados para V2" })).toBeTruthy();
  });

  it("successful migration re-evaluates persistence to v2_ready and keeps V1 keys", async () => {
    seedLegacy();
    const jobsRaw = window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY);
    const appsRaw = window.localStorage.getItem(APPLYFLOW_DASHBOARD_STORAGE_KEY);
    const prep = prepareMigrationBundle();
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;

    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return jsonResponse(200, { authenticated: true, account: { id: ACCOUNT_ID } });
      }
      if (url.endsWith("/migration") && init?.method === "POST") {
        return jsonResponse(200, {
          sessionId: "session_ux_ok",
          status: "completed",
          fingerprint: prep.bundle.fingerprint,
          sourceVersion: 1,
          expectedJobs: prep.bundle.jobs.length,
          expectedApplications: prep.bundle.applications.length,
          processedJobs: prep.bundle.jobs.length,
          processedApplications: prep.bundle.applications.length,
          completedAt: "2026-09-25T21:00:00.000Z",
        });
      }
      if (url.endsWith("/jobs")) return jsonResponse(200, { jobs: [job] });
      if (url.endsWith("/applications")) return jsonResponse(200, { applications: [application] });
      return jsonResponse(500, { error: "unexpected" });
    });
    vi.stubGlobal("fetch", fetchImpl);

    render(<DashboardClient persistenceV2Enabled />);
    fireEvent.click(await screen.findByRole("button", { name: "Migrar dados para V2" }));

    await waitFor(() => {
      expect(screen.queryByText("Migrar dados para a conta")).toBeNull();
    });
    expect(await screen.findByTestId("migration-success-notice")).toBeTruthy();
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY)).toBe(jobsRaw);
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_STORAGE_KEY)).toBe(appsRaw);
    const marker = loadMigrationMarker(ACCOUNT_ID);
    expect(marker?.v1ToV2Complete).toBe(true);
    expect(marker?.accountIdFingerprint).toBe(fingerprintApplyFlowAccountId(ACCOUNT_ID));
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/applyflow/v2/jobs",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("retry after API failure recovers without premature success", async () => {
    seedLegacy();
    const prep = prepareMigrationBundle();
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    let migrationCalls = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return jsonResponse(200, { authenticated: true, account: { id: ACCOUNT_ID } });
      }
      if (url.endsWith("/migration") && init?.method === "POST") {
        migrationCalls += 1;
        if (migrationCalls === 1) {
          return jsonResponse(500, { error: "migration_api_failed" });
        }
        return jsonResponse(200, {
          sessionId: "session_ux_retry",
          status: "completed",
          fingerprint: prep.bundle.fingerprint,
          sourceVersion: 1,
          expectedJobs: prep.bundle.jobs.length,
          expectedApplications: prep.bundle.applications.length,
          processedJobs: prep.bundle.jobs.length,
          processedApplications: prep.bundle.applications.length,
          completedAt: "2026-09-25T21:05:00.000Z",
        });
      }
      if (url.endsWith("/jobs")) return jsonResponse(200, { jobs: [] });
      if (url.endsWith("/applications")) return jsonResponse(200, { applications: [] });
      return jsonResponse(500, { error: "unexpected" });
    });
    vi.stubGlobal("fetch", fetchImpl);
    render(<DashboardClient persistenceV2Enabled />);
    fireEvent.click(await screen.findByRole("button", { name: "Migrar dados para V2" }));
    expect(await screen.findByRole("button", { name: "Tentar novamente" })).toBeTruthy();
    expect(screen.queryByTestId("migration-success-notice")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => {
      expect(screen.getByTestId("migration-success-notice")).toBeTruthy();
    });
    expect(migrationCalls).toBe(2);
  });
});
