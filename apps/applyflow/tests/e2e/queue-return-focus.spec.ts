import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { resolve } from "node:path";

const E2E_SECRET = process.env.APPLYFLOW_E2E_SECRET || "applyflow-e2e-local-only-secret";

async function e2eLogin(request: APIRequestContext) {
  const response = await request.post("/api/applyflow/e2e/session", {
    headers: {
      "content-type": "application/json",
      "x-applyflow-e2e-secret": E2E_SECRET,
    },
    data: { action: "login" },
  });
  expect(response.status()).toBe(200);
}

async function seedLocalResume(page: Page) {
  await page.goto("/dashboard/discover");
  await expect(page.getByTestId("discover-workspace")).toBeVisible({ timeout: 30_000 });
  await page
    .getByTestId("resume-profile-import")
    .setInputFiles(resolve(__dirname, "../../public/demo/e2e-candidate-profile.json"));
  await expect(page.getByRole("button", { name: "Editar perfil" })).toBeVisible({ timeout: 20_000 });
}

/** Lock Match decisions so hydrate reevaluation cannot change fixture filters. */
async function seedQueueJobs(page: Page) {
  await page.evaluate(() => {
    const applyJob = {
      id: "job_focus_apply_1",
      title: "Focus Restore Engineer",
      company: "Focus Co",
      source: "paste",
      status: "reviewing",
      url: "https://example.test/jobs/focus-apply-1",
      jobContext: {
        skills: ["React", "TypeScript"],
        networking: { manualMatchOverride: true },
      },
      jobMatch: {
        score: 86,
        decision: "apply",
        matchedSkills: ["React", "TypeScript"],
        missingSkills: [],
        evaluatedAt: "2026-11-19T12:00:00.000Z",
        scoringVersion: "v1",
      },
      createdAt: "2026-11-19T12:00:00.000Z",
      updatedAt: "2026-11-19T12:00:00.000Z",
    };
    const stretchJob = {
      ...applyJob,
      id: "job_focus_stretch_1",
      title: "Stretch Only Role",
      company: "Stretch Co",
      url: "https://example.test/jobs/focus-stretch-1",
      jobMatch: {
        ...applyJob.jobMatch,
        score: 55,
        decision: "stretch",
        matchedSkills: ["React"],
        missingSkills: ["TypeScript"],
      },
    };
    window.sessionStorage.removeItem("APPLYFLOW_OPPORTUNITY_QUEUE_NAV_V1");
    window.localStorage.setItem(
      "APPLYFLOW_DASHBOARD_JOBS_V1",
      JSON.stringify({
        version: 1,
        savedAt: "2026-11-19T12:00:00.000Z",
        jobs: [applyJob, stretchJob],
      }),
    );
  });
}

async function focusedTestId(page: Page): Promise<string | null> {
  return page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? null);
}

test.describe("Oportunidades return focus", () => {
  test("keyboard open → Voltar restores CTA focus; browser back too; filter fallback", async ({ page }) => {
    await e2eLogin(page.request);
    await seedLocalResume(page);
    await seedQueueJobs(page);

    await page.goto("/dashboard/opportunities");
    await expect(page.getByTestId("job-inbox-card-job_focus_apply_1")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("job-inbox-card-job_focus_stretch_1")).toBeVisible();

    await page.getByTestId("job-queue-filter-decision").selectOption("apply");
    await expect(page.getByTestId("job-queue-filter-decision")).toHaveValue("apply");
    await expect(page.getByTestId("job-inbox-card-job_focus_apply_1")).toBeVisible();
    await expect(page.getByTestId("job-inbox-card-job_focus_stretch_1")).toHaveCount(0);

    // Setup: place focus on CTA then open with Enter (app marks the nav anchor).
    await page.getByTestId("job-inbox-primary-cta-job_focus_apply_1").focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/dashboard\/jobs\/job_focus_apply_1/);

    const back = page.getByRole("link", { name: "Voltar às oportunidades" });
    await back.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/dashboard\/opportunities/);
    await expect(page.getByTestId("job-queue-filter-decision")).toHaveValue("apply");

    await expect
      .poll(async () => focusedTestId(page), { timeout: 10_000 })
      .toBe("job-inbox-primary-cta-job_focus_apply_1");

    await page.keyboard.press("Tab");
    expect(await focusedTestId(page)).not.toBe("job-inbox-primary-cta-job_focus_apply_1");

    // Browser back from a second keyboard open.
    await page.getByTestId("job-inbox-primary-cta-job_focus_apply_1").focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/dashboard\/jobs\/job_focus_apply_1/);
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard\/opportunities/);
    await expect(page.getByTestId("job-queue-filter-decision")).toHaveValue("apply");
    await expect
      .poll(async () => focusedTestId(page), { timeout: 10_000 })
      .toBe("job-inbox-primary-cta-job_focus_apply_1");

    // Isolated fixture: APPLY filter + anchor for a job that the filter hides.
    await page.evaluate(() => {
      window.sessionStorage.setItem(
        "APPLYFLOW_OPPORTUNITY_QUEUE_NAV_V1",
        JSON.stringify({
          view: "active",
          sort: "match",
          decision: "apply",
          source: "all",
          anchorJobId: "job_focus_stretch_1",
        }),
      );
    });
    await page.goto("/dashboard/opportunities");
    await expect(page.getByTestId("job-queue-filter-decision")).toHaveValue("apply");
    await expect(page.getByTestId("job-inbox-card-job_focus_stretch_1")).toHaveCount(0);
    await expect
      .poll(async () => focusedTestId(page), { timeout: 10_000 })
      .toBe("job-queue-filter-decision");
  });

  test("direct detail entry keeps normal keyboard navigation on return", async ({ page }) => {
    await e2eLogin(page.request);
    await seedLocalResume(page);
    await seedQueueJobs(page);

    await page.goto("/dashboard/jobs/job_focus_apply_1");
    await expect(page.getByRole("link", { name: "Voltar às oportunidades" })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("link", { name: "Voltar às oportunidades" }).click();
    await expect(page).toHaveURL(/\/dashboard\/opportunities/);
    await expect(page.getByTestId("job-inbox")).toBeVisible();

    await page.getByTestId("job-queue-filter-decision").focus();
    await page.keyboard.press("Tab");
    const focused = await focusedTestId(page);
    expect(focused).toBeTruthy();
    expect(focused).not.toBe("job-inbox-primary-cta-job_focus_apply_1");
  });
});
