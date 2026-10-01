import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const E2E_SECRET = process.env.APPLYFLOW_E2E_SECRET || "applyflow-e2e-local-only-secret";
const ACCOUNT_A = "e2e_applyflow_v2_account_a";
const ACCOUNT_B = "e2e_applyflow_v2_account_b";
const ACCOUNT_NON_PILOT = "e2e_applyflow_v2_non_pilot";
const ORIGIN = "http://127.0.0.1:3012";
const E2E_PROFILE = JSON.parse(
  readFileSync(resolve(__dirname, "../../public/demo/e2e-candidate-profile.json"), "utf8"),
) as Record<string, unknown>;

async function e2eLogin(
  request: APIRequestContext,
  options: {
    authSub: string;
    seedV2?: boolean;
    seedPilot?: boolean;
    seedNonPilot?: boolean;
  } = {
    authSub: ACCOUNT_A,
    seedV2: true,
  },
) {
  const response = await request.post("/api/applyflow/e2e/session", {
    headers: {
      "content-type": "application/json",
      "x-applyflow-e2e-secret": E2E_SECRET,
    },
    data: {
      action: "login",
      authSub: options.authSub,
      ...(options.seedV2 ? { seedV2: true } : {}),
      ...(options.seedPilot ? { seedPilot: true } : {}),
      ...(options.seedNonPilot ? { seedNonPilot: true } : {}),
    },
  });
  expect(response.status()).toBe(200);
  return response.json() as Promise<{
    ok: boolean;
    accountId?: string;
    canonicalPersistence?: string;
    pilotEligible?: boolean;
  }>;
}

async function e2eLogout(request: APIRequestContext) {
  const response = await request.post("/api/applyflow/e2e/session", {
    headers: { "content-type": "application/json" },
    data: { action: "logout" },
  });
  expect(response.status()).toBe(200);
}

/**
 * Candidate profile remains local-browser even in V2 cloud mode.
 * Seed library storage directly so V2 E2E focuses on Job/Application cloud persistence.
 */
async function seedLocalResume(page: Page) {
  await page.goto("/dashboard/discover");
  await expect(page.getByText("Procurar oportunidades")).toBeVisible({ timeout: 30_000 });
  // Raw CandidateProfile — loadResumeLibrary migrates to ResumeLibrary on hydrate.
  await page.evaluate((profile) => {
    window.localStorage.setItem("APPLYFLOW_RESUME_LIBRARY_V1", JSON.stringify(profile));
  }, E2E_PROFILE);
  await page.reload();
  await expect(page.getByText("Procurar oportunidades")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Editar perfil" })).toBeVisible({ timeout: 20_000 });
}


async function clearV1JobApplicationCache(page: Page) {
  await page.evaluate(() => {
    window.localStorage.removeItem("APPLYFLOW_DASHBOARD_JOBS_V1");
    window.localStorage.removeItem("APPLYFLOW_DASHBOARD_IMPORT_V1");
    window.sessionStorage.clear();
  });
}

test.describe("ApplyFlow V2 cloud critical funnel + tenant isolation", () => {
  test("Account A cloud persistence · reload · Account B isolation · cross-tenant mutation · pilot gate · TheirStack off", async ({
    page,
    browser,
  }) => {
    const api = page.request;

    const loginA = await e2eLogin(api, { authSub: ACCOUNT_A, seedV2: true });
    expect(loginA.canonicalPersistence).toBe("v2_cloud");
    expect(loginA.pilotEligible).toBe(true);

    const meA = await api.get("/api/applyflow/v2/me");
    expect(meA.status()).toBe(200);
    const meABody = await meA.json();
    expect(meABody.persistence?.canonicalPersistence).toBe("v2_cloud");
    expect(meABody.persistence?.pilotEligible).toBe(true);
    expect(meABody.persistence?.mode).toBe("v2_active");

    await seedLocalResume(page);

    await page.getByTestId("discovery-provider-remoteok").check();
    await page.getByTestId("discovery-search").click();
    await expect(page.getByTestId("discovery-hit").filter({ hasText: "E2E Fixture Remote Engineer" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("discovery-match-preview")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("discovery-save").click();
    await expect(page.getByText(/Guardada|já está/i).first()).toBeVisible({ timeout: 15_000 });

    const jobsAfterSave = await api.get("/api/applyflow/v2/jobs");
    expect(jobsAfterSave.status()).toBe(200);
    const jobsA = (await jobsAfterSave.json()) as { jobs: Array<{ id: string }> };
    expect(jobsA.jobs.length).toBeGreaterThan(0);
    const jobIdA = jobsA.jobs[0]!.id;

    await clearV1JobApplicationCache(page);
    await page.reload();
    await expect(page.getByText("Procurar oportunidades")).toBeVisible({ timeout: 30_000 });

    const jobsAfterReload = await api.get("/api/applyflow/v2/jobs");
    expect(jobsAfterReload.status()).toBe(200);
    const reloadedJobs = (await jobsAfterReload.json()) as { jobs: Array<{ id: string }> };
    expect(reloadedJobs.jobs.some((j) => j.id === jobIdA)).toBe(true);

    await page.getByTestId("job-queue-view-active").click();
    await expect(page.getByTestId(`job-inbox-card-${jobIdA}`)).toBeVisible({ timeout: 20_000 });
    await page.getByRole("link", { name: "Analisar vaga" }).first().click();

    await expect(page.getByTestId("application-readiness")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("register-application")).toBeVisible();

    await page.getByTestId("register-application").click();
    await expect(page.getByTestId("mark-application-sent")).toBeVisible({ timeout: 15_000 });

    const appsAfterRegister = await api.get("/api/applyflow/v2/applications");
    expect(appsAfterRegister.status()).toBe(200);
    const appsA = (await appsAfterRegister.json()) as {
      applications: Array<{ id: string; version: number; status: string; sourceJobId: string | null }>;
    };
    expect(appsA.applications.length).toBeGreaterThan(0);
    const appA = appsA.applications[0]!;
    const applicationIdA = appA.id;

    await clearV1JobApplicationCache(page);
    await page.reload();
    await expect(page.getByTestId("mark-application-sent")).toBeVisible({ timeout: 30_000 });

    await page.getByTestId("mark-application-sent").click();
    await page.getByTestId("lifecycle-other-toggle").click();
    await expect(page.getByTestId("lifecycle-screening")).toBeEnabled({ timeout: 15_000 });

    await page.getByTestId("lifecycle-screening").click();
    await expect(page.getByTestId("application-next-action")).toBeVisible({ timeout: 15_000 });

    await clearV1JobApplicationCache(page);
    await page.reload();
    await expect(page.getByTestId("application-readiness")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Screening|Triagem|interview|Entrevista/i).first()).toBeVisible();

    const appsSynced = await api.get("/api/applyflow/v2/applications");
    const appsSyncedBody = (await appsSynced.json()) as {
      applications: Array<{ id: string; status: string; sourceJobId: string | null }>;
    };
    const syncedApp = appsSyncedBody.applications.find((a) => a.id === applicationIdA);
    expect(syncedApp?.status).toBe("interview");

    if (syncedApp?.sourceJobId) {
      const linkedJob = await api.get(`/api/applyflow/v2/jobs/${encodeURIComponent(syncedApp.sourceJobId)}`);
      expect(linkedJob.status()).toBe(200);
      const linkedBody = (await linkedJob.json()) as { status: string };
      expect(linkedBody.status).toBe("interview");
    }

    // --- Account B isolation + cross-tenant mutation ---
    const contextB = await browser.newContext({ baseURL: ORIGIN });
    const pageB = await contextB.newPage();
    const apiB = pageB.request;
    await e2eLogin(apiB, { authSub: ACCOUNT_B, seedV2: true });

    const listJobsB = await apiB.get("/api/applyflow/v2/jobs");
    expect(listJobsB.status()).toBe(200);
    const jobsB = (await listJobsB.json()) as { jobs: Array<{ id: string }> };
    expect(jobsB.jobs.some((j) => j.id === jobIdA)).toBe(false);

    const listAppsB = await apiB.get("/api/applyflow/v2/applications");
    expect(listAppsB.status()).toBe(200);
    const appsB = (await listAppsB.json()) as { applications: Array<{ id: string }> };
    expect(appsB.applications.some((a) => a.id === applicationIdA)).toBe(false);

    const directJob = await apiB.get(`/api/applyflow/v2/jobs/${encodeURIComponent(jobIdA)}`);
    expect(directJob.status()).toBe(404);
    expect((await directJob.json()).error).toBe("not_found");

    const directApp = await apiB.get(
      `/api/applyflow/v2/applications/${encodeURIComponent(applicationIdA)}`,
    );
    expect(directApp.status()).toBe(404);
    expect((await directApp.json()).error).toBe("not_found");

    const mutateJob = await apiB.patch(`/api/applyflow/v2/jobs/${encodeURIComponent(jobIdA)}`, {
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
      },
      data: { expectedVersion: 1, status: "rejected", title: "Hacked" },
    });
    expect([403, 404]).toContain(mutateJob.status());

    const mutateApp = await apiB.patch(
      `/api/applyflow/v2/applications/${encodeURIComponent(applicationIdA)}`,
      {
        headers: {
          "content-type": "application/json",
          origin: ORIGIN,
        },
        data: { expectedVersion: 1, status: "rejected" },
      },
    );
    expect([403, 404]).toContain(mutateApp.status());

    const lifecycleB = await apiB.post(
      `/api/applyflow/v2/applications/${encodeURIComponent(applicationIdA)}/lifecycle`,
      {
        headers: {
          "content-type": "application/json",
          origin: ORIGIN,
        },
        data: { expectedVersion: 1, status: "rejected" },
      },
    );
    expect([403, 404]).toContain(lifecycleB.status());

    // Account A data unchanged
    const jobStillA = await api.get(`/api/applyflow/v2/jobs/${encodeURIComponent(jobIdA)}`);
    expect(jobStillA.status()).toBe(200);
    expect(((await jobStillA.json()) as { title?: string }).title).not.toBe("Hacked");

    const appStillA = await api.get(
      `/api/applyflow/v2/applications/${encodeURIComponent(applicationIdA)}`,
    );
    expect(appStillA.status()).toBe(200);
    expect(((await appStillA.json()) as { status: string }).status).toBe("interview");

    await contextB.close();

    // --- Pilot gate: non-pilot cannot use V2 product surfaces ---
    await e2eLogout(api);
    await e2eLogin(api, { authSub: ACCOUNT_NON_PILOT, seedNonPilot: true });
    const nonPilotJobs = await api.get("/api/applyflow/v2/jobs");
    expect(nonPilotJobs.status()).toBe(403);
    expect((await nonPilotJobs.json()).error).toBe("persistence_v2_not_eligible");

    const nonPilotActivate = await api.post("/api/applyflow/v2/activate", {
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
      },
      data: {
        protocolVersion: 1,
        attestation: "legacy_empty_v1",
        sourceVersion: 1,
        fingerprint: "invalid-for-non-pilot",
        jobs: [],
        applications: [],
      },
    });
    expect(nonPilotActivate.status()).toBe(403);
    expect((await nonPilotActivate.json()).error).toMatch(
      /persistence_v2_(not_eligible|activation_not_eligible)/,
    );

    // TheirStack remains off
    await e2eLogin(api, { authSub: ACCOUNT_A, seedV2: true });
    const theirStack = await api.post("/api/applyflow/job-sources/search", {
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
      },
      data: { provider: "theirstack", page: 1, limit: 5 },
    });
    expect(theirStack.status()).toBe(403);
    expect((await theirStack.json()).error).toBe("provider_not_available");

    await e2eLogout(api);
  });
});

test.describe("V2 E2E safety", () => {
  test("session bootstrap refuses without secret", async ({ request }) => {
    const response = await request.post("/api/applyflow/e2e/session", {
      headers: { "content-type": "application/json" },
      data: { action: "login", authSub: ACCOUNT_A, seedV2: true },
    });
    expect(response.status()).toBe(403);
  });
});

// Keep browser typed for TS unused import guard in some configs
void (null as unknown as Browser);
