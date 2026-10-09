import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const E2E_PROFILE = JSON.parse(
  readFileSync(resolve(__dirname, "../../public/demo/e2e-candidate-profile.json"), "utf8"),
) as Record<string, unknown>;

const E2E_SECRET = process.env.APPLYFLOW_E2E_SECRET || "applyflow-e2e-local-only-secret";
const ACTIVE = "e2e_applyflow_rollout_active";
const READ_ONLY = "e2e_applyflow_rollout_readonly";
const PAUSED = "e2e_applyflow_rollout_paused";
const SWITCH_B = "e2e_applyflow_switch_b";
const ORIGIN = "http://127.0.0.1:3012";
const LOCAL_ONLY_TITLE = "LOCAL ONLY MUST NOT APPEAR";
const ACTIVE_JOB_ID = "e2e_rollout_active_job";
const ACTIVE_JOB_TITLE = "E2E Rollout Active Role";

async function login(
  request: APIRequestContext,
  authSub: string,
  mode: "active" | "read_only" | "paused",
) {
  const response = await request.post("/api/applyflow/e2e/session", {
    headers: {
      "content-type": "application/json",
      "x-applyflow-e2e-secret": E2E_SECRET,
    },
    data: {
      action: "login",
      authSub,
      ...(mode === "read_only" ? { seedReadOnly: true } : { seedV2: true }),
    },
  });
  expect(response.status()).toBe(200);
  return (await response.json()) as {
    accountId: string;
    canonicalPersistence: string;
    pilotEligible: boolean;
  };
}

async function plantLocalJob(page: Page) {
  await page.addInitScript((title) => {
    window.localStorage.setItem(
      "APPLYFLOW_DASHBOARD_JOBS_V1",
      JSON.stringify([
        {
          id: "local-only-job",
          title,
          source: "paste",
          status: "reviewing",
          createdAt: "2026-10-01T12:00:00.000Z",
          updatedAt: "2026-10-01T12:00:00.000Z",
        },
      ]),
    );
  }, LOCAL_ONLY_TITLE);
}

test.describe("rollout modes in the browser", () => {
  test("selected cloud account is active and ignores the anonymous local job", async ({ page }) => {
    const seeded = await login(page.request, ACTIVE, "active");
    expect(seeded.canonicalPersistence).toBe("v2_cloud");
    expect(seeded.pilotEligible).toBe(true);
    expect(seeded.accountId).toBe("11111111-1111-4111-8111-111111111111");

    const me = await page.request.get("/api/applyflow/v2/me");
    expect(me.status()).toBe(200);
    expect((await me.json()).persistence.mode).toBe("v2_active");

    const created = await page.request.post("/api/applyflow/v2/jobs", {
      headers: { "content-type": "application/json", origin: ORIGIN },
      data: {
        id: ACTIVE_JOB_ID,
        title: ACTIVE_JOB_TITLE,
        source: "paste",
        status: "reviewing",
        url: "https://jobs.example.com/e2e/rollout-active",
        descriptionSnapshot: "Synthetic rollout job",
        jobContext: { skills: ["TypeScript"] },
        jobMatch: {
          score: 80,
          decision: "apply",
          matchedSkills: ["TypeScript"],
          missingSkills: [],
          evaluatedAt: "2026-10-09T12:00:00.000Z",
          scoringVersion: "v1",
        },
      },
    });
    expect(created.status()).toBe(201);

    await plantLocalJob(page);
    await page.goto("/dashboard");
    await expect(page.getByTestId("persistence-privacy-v2_active")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("na fila ativa")).toBeVisible();
    await expect(page.getByText(LOCAL_ONLY_TITLE)).toHaveCount(0);
    await page.goto("/dashboard/opportunities");
    await expect(page.getByTestId(`job-inbox-card-${ACTIVE_JOB_ID}`)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId(`job-inbox-card-${ACTIVE_JOB_ID}`).getByText(ACTIVE_JOB_TITLE)).toBeVisible();
    await expect(page.getByText(LOCAL_ONLY_TITLE)).toHaveCount(0);
  });

  test("selected cloud account without eligibility is read-only", async ({ page }) => {
    const seeded = await login(page.request, READ_ONLY, "read_only");
    expect(seeded.accountId).toBe("22222222-2222-4222-8222-222222222222");
    expect(seeded.canonicalPersistence).toBe("v2_cloud");
    expect(seeded.pilotEligible).toBe(false);

    const me = await page.request.get("/api/applyflow/v2/me");
    expect((await me.json()).persistence.mode).toBe("v2_read_only");

    const listed = await page.request.get("/api/applyflow/v2/jobs");
    expect(listed.status()).toBe(200);

    const denied = await page.request.post("/api/applyflow/v2/jobs", {
      headers: { "content-type": "application/json", origin: ORIGIN },
      data: { id: "e2e_rollout_denied", title: "Should not persist", source: "paste", status: "reviewing" },
    });
    expect(denied.status()).toBe(403);
    expect((await denied.json()).error).toBe("persistence_v2_read_only");

    await plantLocalJob(page);
    await page.goto("/dashboard");
    await expect(page.getByTestId("persistence-read-only-banner")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("persistence-privacy-v2_read_only")).toBeVisible();
    await expect(page.getByText(LOCAL_ONLY_TITLE)).toHaveCount(0);
  });

  test("cloud account outside the allowlist stays paused without local fallback", async ({ page }) => {
    const seeded = await login(page.request, PAUSED, "paused");
    expect(seeded.accountId).toBe("33333333-3333-4333-8333-333333333333");
    expect(seeded.canonicalPersistence).toBe("v2_cloud");
    expect(seeded.pilotEligible).toBe(true);

    const me = await page.request.get("/api/applyflow/v2/me");
    const meBody = await me.json();
    expect(meBody.persistence.mode).toBe("v2_paused");
    expect(meBody.persistence.canonicalPersistence).toBe("v2_cloud");

    const listed = await page.request.get("/api/applyflow/v2/jobs");
    expect(listed.status()).toBe(503);
    expect((await listed.json()).error).toBe("persistence_v2_paused");

    const migrate = await page.request.post("/api/applyflow/v2/migration", {
      headers: { "content-type": "application/json", origin: ORIGIN },
      data: {},
    });
    expect(migrate.status()).toBe(503);

    await plantLocalJob(page);
    await page.goto("/dashboard");
    await expect(page.getByTestId("persistence-paused-notice")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Persistência na nuvem temporariamente indisponível")).toBeVisible();
    await expect(page.getByText(LOCAL_ONLY_TITLE)).toHaveCount(0);
    await expect(page.getByTestId("job-inbox-card-local-only-job")).toHaveCount(0);
  });

  test("logout A then B keeps namespaced storage and does not show A's cloud profile", async ({ page }) => {
    const accountA = await login(page.request, ACTIVE, "active");
    const profileA = await page.request.put("/api/applyflow/v2/profile", {
      headers: { "content-type": "application/json", origin: ORIGIN },
      data: {
        library: {
          version: 1,
          defaultVariantId: "rv_principal",
          variants: [
            {
              id: "rv_principal",
              name: "Conta Active Only",
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
    expect(profileA.status()).toBe(200);

    await page.goto("/dashboard");
    await expect(page.getByTestId("persistence-privacy-v2_active")).toBeVisible({ timeout: 30_000 });

    const logout = await page.request.post("/api/applyflow/e2e/session", {
      headers: { "content-type": "application/json" },
      data: { action: "logout" },
    });
    expect(logout.status()).toBe(200);

    const accountB = await login(page.request, SWITCH_B, "active");
    expect(accountB.accountId).toBe("11111111-1111-4111-8111-111111111105");
    expect(accountB.accountId).not.toBe(accountA.accountId);

    await page.goto("/dashboard");
    await expect(page.getByTestId("persistence-privacy-v2_active")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Conta Active Only")).toHaveCount(0);

    const profileB = await page.request.get("/api/applyflow/v2/profile");
    expect(profileB.status()).toBe(200);
    expect((await profileB.json()).profile).toBeNull();

    const storage = await page.evaluate((ids) => {
      return Object.keys(window.localStorage).map((key) => ({
        key,
        value: window.localStorage.getItem(key) ?? "",
        scopedToA: key.includes(ids.a),
        scopedToB: key.includes(ids.b),
      }));
    }, { a: accountA.accountId, b: accountB.accountId });
    const leaked = storage.filter(
      (entry) => entry.scopedToB && entry.value.includes("Conta Active Only"),
    );
    expect(leaked).toEqual([]);
  });
});
