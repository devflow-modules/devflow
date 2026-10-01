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

async function e2eLogout(request: APIRequestContext) {
  const response = await request.post("/api/applyflow/e2e/session", {
    headers: { "content-type": "application/json" },
    data: { action: "logout" },
  });
  expect(response.status()).toBe(200);
}

async function seedLocalResume(page: Page) {
  await page.goto("/dashboard");
  await expect(page.getByText("Procurar oportunidades")).toBeVisible();
  const fileInput = page.locator('input[type="file"][accept*="json"]').first();
  await fileInput.setInputFiles(resolve(__dirname, "../../public/demo/e2e-candidate-profile.json"));
  await expect(page.getByRole("button", { name: "Editar perfil" })).toBeVisible({ timeout: 20_000 });
}

test.describe("ApplyFlow closed-beta critical funnel", () => {
  test("auth · discovery fixtures · save · queue · readiness · application · reload · TheirStack off · logout", async ({
    page,
  }) => {
    const api = page.request;

    await e2eLogin(api);
    await seedLocalResume(page);

    let searchBody: unknown = null;
    page.on("request", (req) => {
      if (req.url().includes("/api/applyflow/job-sources/search") && req.method() === "POST") {
        try {
          searchBody = req.postDataJSON();
        } catch {
          searchBody = null;
        }
      }
    });

    await page.getByTestId("discovery-provider-remoteok").check();
    await page.getByTestId("discovery-search").click();
    await expect(page.getByText("E2E Fixture Remote Engineer")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("discovery-match-preview")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("remoteok-attribution")).toBeVisible();
    const listing = page.getByTestId("remoteok-listing-link");
    await expect(listing).toHaveAttribute("href", "https://remoteok.com/remote-jobs/e2e-ro-1");
    const rel = await listing.getAttribute("rel");
    expect(rel ?? "").toContain("noopener");
    expect(rel ?? "").not.toContain("nofollow");

    expect(searchBody).toBeTruthy();
    const body = searchBody as Record<string, unknown>;
    expect(body).not.toHaveProperty("cv");
    expect(body).not.toHaveProperty("resume");
    expect(body).not.toHaveProperty("profile");
    expect(body.provider).toBe("remoteok");

    await page.getByTestId("discovery-save").click();
    await expect(page.getByText(/Guardada|já está/i).first()).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("job-queue-view-active").click();
    await expect(page.getByTestId("job-inbox-card-job_ro_e2e-ro-1")).toBeVisible();
    await page.getByRole("link", { name: "Analisar vaga" }).first().click();

    await expect(page.getByTestId("application-readiness")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("register-application")).toBeVisible();
    await expect(page.getByTestId("remoteok-analysis-attribution")).toBeVisible();

    await page.getByTestId("register-application").click();
    await expect(page.getByTestId("mark-application-sent")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("register-application")).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId("mark-application-sent")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("register-application")).toHaveCount(0);

    await page.getByTestId("mark-application-sent").click();
    await expect(page.getByTestId("lifecycle-screening")).toBeEnabled({ timeout: 15_000 });

    await page.getByTestId("lifecycle-screening").click();
    await expect(page.getByTestId("application-next-action")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("application-readiness")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Screening|Triagem/i).first()).toBeVisible();

    await page.goto("/dashboard");
    await page.getByTestId("job-queue-view-active").click();
    await expect(page.getByTestId("job-inbox-card-job_ro_e2e-ro-1")).toHaveCount(0);

    const theirStack = await api.post("/api/applyflow/job-sources/search", {
      headers: {
        "content-type": "application/json",
        origin: "http://127.0.0.1:3011",
      },
      data: { provider: "theirstack", page: 1, limit: 5 },
    });
    expect(theirStack.status()).toBe(403);
    const theirBody = await theirStack.json();
    expect(theirBody.error).toBe("provider_not_available");

    await page.goto("/account");
    await page.getByTestId("applyflow-logout").click();
    await expect(page).toHaveURL(/\/login/);

    await e2eLogout(api);
    const afterLogoutSearch = await api.post("/api/applyflow/job-sources/search", {
      headers: {
        "content-type": "application/json",
        origin: "http://127.0.0.1:3011",
      },
      data: { provider: "theirstack", page: 1, limit: 5 },
    });
    expect([401, 403]).toContain(afterLogoutSearch.status());
  });

  test("E2E session bootstrap refuses without secret", async ({ request }) => {
    const response = await request.post("/api/applyflow/e2e/session", {
      headers: { "content-type": "application/json" },
      data: { action: "login" },
    });
    expect(response.status()).toBe(403);
  });
});
