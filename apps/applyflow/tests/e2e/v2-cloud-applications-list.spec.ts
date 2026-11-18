import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * V2 cloud: confirmed send without a persisted Application must appear once in
 * Candidaturas (including after full reload), without inventing an Application
 * on read. Complements v2-cloud-funnel (register → mark-sent with Application).
 */

const E2E_SECRET = process.env.APPLYFLOW_E2E_SECRET || "applyflow-e2e-local-only-secret";
const ACCOUNT = "e2e_applyflow_v2_account_applications_list";
const E2E_PROFILE = JSON.parse(
  readFileSync(resolve(__dirname, "../../public/demo/e2e-candidate-profile.json"), "utf8"),
) as Record<string, unknown>;

async function e2eLogin(request: APIRequestContext) {
  const response = await request.post("/api/applyflow/e2e/session", {
    headers: {
      "content-type": "application/json",
      "x-applyflow-e2e-secret": E2E_SECRET,
    },
    data: {
      action: "login",
      authSub: ACCOUNT,
      seedV2: true,
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

async function seedAccountResume(page: Page) {
  const saved = await page.request.put("/api/applyflow/v2/profile", {
    data: {
      library: {
        version: 1,
        defaultVariantId: "rv_principal",
        variants: [
          {
            id: "rv_principal",
            name: "Perfil principal",
            profile: E2E_PROFILE,
            isDefault: true,
            source: "manual",
            createdAt: "2026-10-05T12:00:00.000Z",
            updatedAt: "2026-10-05T12:00:00.000Z",
          },
        ],
      },
    },
  });
  expect(saved.status()).toBe(200);
  await page.goto("/dashboard/discover");
  await expect(page.getByText("Procurar oportunidades")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Editar perfil" })).toBeVisible({ timeout: 20_000 });
}

async function clearV1Caches(page: Page) {
  await page.evaluate(() => {
    window.localStorage.removeItem("APPLYFLOW_DASHBOARD_JOBS_V1");
    window.localStorage.removeItem("APPLYFLOW_DASHBOARD_IMPORT_V1");
    window.sessionStorage.clear();
  });
}

test.describe("ApplyFlow V2 Candidaturas list from applied jobs", () => {
  test("Sim, enviei without Application → Candidaturas 1× → reload 1×; no Application written on read", async ({
    page,
  }) => {
    const api = page.request;
    page.on("dialog", (dialog) => {
      void dialog.accept();
    });

    const login = await e2eLogin(api);
    expect(login.canonicalPersistence).toBe("v2_cloud");
    expect(login.pilotEligible).toBe(true);

    await seedAccountResume(page);

    await page.getByTestId("discovery-provider-remoteok").check();
    await page.getByTestId("discovery-search").click();
    await expect(page.getByTestId("discovery-hit").filter({ hasText: "E2E Fixture Remote Engineer" })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByTestId("discovery-save").click();
    await expect(page.getByText(/Guardada|já está/i).first()).toBeVisible({ timeout: 15_000 });

    const jobsAfterSave = await api.get("/api/applyflow/v2/jobs");
    expect(jobsAfterSave.status()).toBe(200);
    const jobsBody = (await jobsAfterSave.json()) as {
      jobs: Array<{ id: string; status: string; company?: string; title?: string }>;
    };
    expect(jobsBody.jobs.length).toBeGreaterThan(0);
    const job = jobsBody.jobs[0]!;
    const jobId = job.id;
    expect(job.status).toBe("reviewing");

    const appsBefore = await api.get("/api/applyflow/v2/applications");
    expect(appsBefore.status()).toBe(200);
    const appsBeforeBody = (await appsBefore.json()) as {
      applications: Array<{ id: string; sourceJobId?: string | null }>;
    };
    expect(appsBeforeBody.applications.some((a) => a.sourceJobId === jobId)).toBe(false);

    await clearV1Caches(page);
    await page.goto("/dashboard/applications");
    await expect(page.getByRole("heading", { name: "Candidaturas" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Ainda sem candidaturas")).toBeVisible();
    await expect(page.getByTestId("application-row-derived-applied-job")).toHaveCount(0);
    await expect(page.getByTestId("application-row")).toHaveCount(0);

    await page.goto(`/dashboard/jobs/${encodeURIComponent(jobId)}`);
    await expect(page.getByTestId(`manual-app-open-${jobId}`)).toBeVisible({ timeout: 30_000 });

    await page.getByTestId(`manual-app-open-${jobId}`).click();
    await expect(page.getByTestId(`manual-app-confirm-yes-${jobId}`)).toBeVisible({ timeout: 10_000 });
    await page.getByTestId(`manual-app-confirm-yes-${jobId}`).click();

    await expect
      .poll(async () => {
        const res = await api.get(`/api/applyflow/v2/jobs/${encodeURIComponent(jobId)}`);
        if (res.status() !== 200) return "pending";
        const body = (await res.json()) as { status: string };
        return body.status;
      }, { timeout: 30_000 })
      .toBe("applied");

    const appsAfterMark = await api.get("/api/applyflow/v2/applications");
    expect(appsAfterMark.status()).toBe(200);
    const appsAfterMarkBody = (await appsAfterMark.json()) as {
      applications: Array<{ id: string; sourceJobId?: string | null }>;
    };
    expect(appsAfterMarkBody.applications.some((a) => a.sourceJobId === jobId)).toBe(false);

    await clearV1Caches(page);
    await page.goto("/dashboard/applications");
    await expect(page.getByText(/1 candidatura registada/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("application-row-derived-applied-job")).toHaveCount(1);
    await expect(page.getByTestId("application-row")).toHaveCount(0);
    await expect(page.getByText("Ainda sem candidaturas")).toHaveCount(0);
    if (job.company) {
      await expect(page.getByText(job.company).first()).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Ver análise" })).toHaveAttribute(
      "href",
      `/dashboard/jobs/${encodeURIComponent(jobId)}`,
    );
    // Derived rows must not expose Application-only actions.
    await expect(page.getByRole("button", { name: /Preparar entrevista|Marcar como enviada/i })).toHaveCount(0);

    await clearV1Caches(page);
    await page.reload();
    await expect(page.getByText(/1 candidatura registada/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("application-row-derived-applied-job")).toHaveCount(1);
    await expect(page.getByTestId("application-row")).toHaveCount(0);

    const appsAfterReload = await api.get("/api/applyflow/v2/applications");
    expect(appsAfterReload.status()).toBe(200);
    const appsAfterReloadBody = (await appsAfterReload.json()) as {
      applications: Array<{ id: string; sourceJobId?: string | null }>;
    };
    expect(appsAfterReloadBody.applications.some((a) => a.sourceJobId === jobId)).toBe(false);
    expect(appsAfterReloadBody.applications.length).toBe(appsAfterMarkBody.applications.length);

    const jobAfterReload = await api.get(`/api/applyflow/v2/jobs/${encodeURIComponent(jobId)}`);
    expect(jobAfterReload.status()).toBe(200);
    expect(((await jobAfterReload.json()) as { status: string }).status).toBe("applied");

    await e2eLogout(api);
  });

  test("persisted Application wins: no derived duplicate row", async ({ page }) => {
    const api = page.request;
    page.on("dialog", (dialog) => {
      void dialog.accept();
    });

    await e2eLogin(api);
    await seedAccountResume(page);

    await page.getByTestId("discovery-provider-remoteok").check();
    await page.getByTestId("discovery-search").click();
    await expect(page.getByTestId("discovery-hit").filter({ hasText: "E2E Fixture Remote Engineer" })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByTestId("discovery-save").click();
    await expect(page.getByText(/Guardada|já está/i).first()).toBeVisible({ timeout: 15_000 });

    const jobsRes = await api.get("/api/applyflow/v2/jobs");
    const jobs = ((await jobsRes.json()) as { jobs: Array<{ id: string }> }).jobs;
    const jobId = jobs[0]!.id;

    await page.getByTestId("job-queue-view-active").click();
    await expect(page.getByTestId(`job-inbox-card-${jobId}`)).toBeVisible({ timeout: 20_000 });
    await page.getByTestId(`job-inbox-primary-cta-${jobId}`).click();
    await expect(page.getByTestId("register-application")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("register-application").click();
    await expect(page.getByTestId("mark-application-sent")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("mark-application-sent").click();

    const appsRes = await api.get("/api/applyflow/v2/applications");
    const apps = (
      (await appsRes.json()) as {
        applications: Array<{ id: string; status: string; sourceJobId?: string | null; appliedAt?: string }>;
      }
    ).applications.filter((a) => a.sourceJobId === jobId);
    expect(apps).toHaveLength(1);
    expect(apps[0]!.status).toBe("applied");

    await clearV1Caches(page);
    await page.goto("/dashboard/applications");
    await expect(page.getByText(/1 candidatura registada/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("application-row")).toHaveCount(1);
    await expect(page.getByTestId("application-row-derived-applied-job")).toHaveCount(0);

    await clearV1Caches(page);
    await page.reload();
    await expect(page.getByText(/1 candidatura registada/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("application-row")).toHaveCount(1);
    await expect(page.getByTestId("application-row-derived-applied-job")).toHaveCount(0);

    await e2eLogout(api);
  });
});
