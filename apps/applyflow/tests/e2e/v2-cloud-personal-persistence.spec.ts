import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type APIRequestContext } from "@playwright/test";

const E2E_SECRET = process.env.APPLYFLOW_E2E_SECRET || "applyflow-e2e-local-only-secret";
const LEGACY_PROFILE_KEY = "APPLYFLOW_RESUME_LIBRARY_V1";
const profile = JSON.parse(
  readFileSync(resolve(__dirname, "../../public/demo/e2e-candidate-profile.json"), "utf8"),
) as Record<string, unknown>;

function library(name: string) {
  return {
    version: 1,
    defaultVariantId: "rv_principal",
    variants: [
      {
        id: "rv_principal",
        name,
        profile,
        isDefault: true,
        source: "manual",
        createdAt: "2026-10-05T12:00:00.000Z",
        updatedAt: "2026-10-05T12:00:00.000Z",
      },
    ],
  };
}

async function login(request: APIRequestContext, authSub: string) {
  const response = await request.post("/api/applyflow/e2e/session", {
    headers: { "content-type": "application/json", "x-applyflow-e2e-secret": E2E_SECRET },
    data: { action: "login", authSub, seedV2: true },
  });
  expect(response.status()).toBe(200);
  return (await response.json()) as { accountId: string; canonicalPersistence: string };
}

async function logout(request: APIRequestContext) {
  const response = await request.post("/api/applyflow/e2e/session", {
    headers: { "content-type": "application/json" },
    data: { action: "logout" },
  });
  expect(response.status()).toBe(200);
}

test.describe("account personal persistence", () => {
  test("saves, reloads, isolates accounts, blocks logout and stale local fallback", async ({ page, browser }) => {
    const api = page.request;
    const accountA = await login(api, "e2e_applyflow_personal_a");
    expect(accountA.canonicalPersistence).toBe("v2_cloud");

    const profile = await api.put("/api/applyflow/v2/profile", {
      data: { library: library("Conta A") },
    });
    expect(profile.status()).toBe(200);
    const profileBody = (await profile.json()) as { version: number };
    const contact = await api.put("/api/applyflow/v2/contacts", {
      data: {
        contact: {
          id: "contact-personal-a",
          name: "Jordan Manager",
          type: "engineering_manager",
          status: "not_contacted",
          createdAt: "2026-09-09T12:00:00.000Z",
          updatedAt: "2026-09-09T12:00:00.000Z",
        },
      },
    });
    expect(contact.status()).toBe(200);
    const interaction = await api.post("/api/applyflow/v2/contacts", {
      data: {
        interaction: {
          id: "interaction-personal-a",
          contactId: "contact-personal-a",
          type: "note",
          occurredAt: "2026-10-05T12:00:00.000Z",
        },
      },
    });
    expect(interaction.status()).toBe(200);
    const response = await api.put("/api/applyflow/v2/responses", {
      data: {
        detection: {
          id: "detect-personal-a",
          emailId: "msg-personal-a",
          provider: "gmail",
          headline: "Resposta",
          matchStatus: "unmatched",
          matchConfidence: "low",
          matchEvidence: [],
          classification: "unknown",
          classificationConfidence: "high",
          classificationEvidence: [],
          suggestedStatus: null,
          pipelineChange: false,
          state: "pending_review",
          detectedAt: "2026-09-15T18:00:00.000Z",
          receivedAt: "2026-09-15T18:00:00.000Z",
          senderDomain: "jobs.example",
          autoApply: false,
          reviewRequired: true,
        },
      },
    });
    expect(response.status()).toBe(200);
    const sameSender = await api.put("/api/applyflow/v2/responses", {
      data: {
        detection: {
          id: "detect-personal-a-2",
          emailId: "msg-personal-a-2",
          provider: "gmail",
          headline: "Outra mensagem",
          matchStatus: "unmatched",
          matchConfidence: "low",
          matchEvidence: [],
          classification: "unknown",
          classificationConfidence: "high",
          classificationEvidence: [],
          suggestedStatus: null,
          pipelineChange: false,
          state: "pending_review",
          detectedAt: "2026-09-15T18:00:00.000Z",
          receivedAt: "2026-09-15T18:00:00.000Z",
          senderDomain: "jobs.example",
          autoApply: false,
          reviewRequired: true,
        },
      },
    });
    expect(sameSender.status()).toBe(200);

    await page.goto("/account");
    await page.reload();
    const reloaded = await api.get("/api/applyflow/v2/profile");
    expect(reloaded.status()).toBe(200);
    const reloadedBody = (await reloaded.json()) as { profile: { library: { variants: Array<{ name: string }> } } };
    expect(reloadedBody.profile.library.variants[0]?.name).toBe("Conta A");

    const other = await browser.newContext();
    const otherApi = other.request;
    const accountAAgain = await login(otherApi, "e2e_applyflow_personal_a");
    expect(accountAAgain.accountId).toBe(accountA.accountId);
    const otherProfile = await otherApi.get("/api/applyflow/v2/profile");
    expect(((await otherProfile.json()) as { profile: { library: { variants: Array<{ name: string }> } } }).profile.library.variants[0]?.name).toBe(
      "Conta A",
    );
    await other.close();

    const accountB = await browser.newContext();
    const apiB = accountB.request;
    const seededB = await login(apiB, "e2e_applyflow_personal_b");
    expect(seededB.accountId).not.toBe(accountA.accountId);
    expect(((await (await apiB.get("/api/applyflow/v2/profile")).json()) as { profile: unknown }).profile).toBeNull();
    const cross = await apiB.put("/api/applyflow/v2/contacts", {
      data: {
        contact: {
          id: "contact-cross",
          name: "Jordan Manager",
          type: "engineering_manager",
          status: "not_contacted",
          applicationId: "app-a",
          jobId: "job-a",
          createdAt: "2026-09-09T12:00:00.000Z",
          updatedAt: "2026-09-09T12:00:00.000Z",
        },
      },
    });
    expect(cross.status()).toBe(404);

    const conflict = await api.put("/api/applyflow/v2/profile", {
      data: { library: library("Tentativa"), expectedVersion: profileBody.version - 1 },
    });
    expect(conflict.status()).toBe(409);
    expect(
      ((await (await api.get("/api/applyflow/v2/profile")).json()) as { profile: { library: { variants: Array<{ name: string }> } } })
        .profile.library.variants[0]?.name,
    ).toBe("Conta A");

    await page.goto("/account");
    await page.evaluate((key) => {
      window.localStorage.setItem(key, JSON.stringify({ marker: "legacy-a" }));
    }, LEGACY_PROFILE_KEY);
    await page.route("**/api/applyflow/v2/profile", (route) => {
      if (route.request().method() === "PUT") {
        return route.abort("failed");
      }
      return route.continue();
    });
    const failed = await page.evaluate(async () => {
      try {
        const response = await fetch("/api/applyflow/v2/profile", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ library: { broken: true } }),
        });
        return response.ok;
      } catch {
        return false;
      }
    });
    expect(failed).toBe(false);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), LEGACY_PROFILE_KEY)).toContain("legacy-a");
    await page.unroute("**/api/applyflow/v2/profile");

    const minted = await api.post("/api/applyflow/v2/extension/session");
    expect(minted.status()).toBe(200);
    const grant = (await minted.json()) as { token: string; accountId: string };
    expect(grant.token).toBeTruthy();
    const authed = await api.get("/api/applyflow/v2/extension/session", {
      headers: { authorization: `Bearer ${grant.token}` },
    });
    expect(authed.status()).toBe(200);
    expect(((await authed.json()) as { accountId: string }).accountId).toBe(accountA.accountId);

    await page.goto("/account");
    await page.getByRole("button", { name: "Probe /me" }).click();
    await expect(page.getByTestId("personal-import-account")).toBeVisible();
    await expect(page.getByTestId("personal-import-submit")).toBeDisabled();
    await page.getByTestId("personal-import-confirm").check();
    await expect(page.getByTestId("personal-import-submit")).toBeEnabled();

    const revoked = await api.delete("/api/applyflow/v2/extension/session");
    expect(revoked.status()).toBe(200);
    expect((await api.get("/api/applyflow/v2/extension/session", {
      headers: { authorization: `Bearer ${grant.token}` },
    })).status()).toBe(401);

    await logout(api);
    expect((await api.get("/api/applyflow/v2/profile")).status()).toBe(401);
    const mintedAfterLogout = await api.post("/api/applyflow/v2/extension/session");
    expect(mintedAfterLogout.status()).toBe(401);

    const switched = await login(apiB, "e2e_applyflow_personal_b");
    expect(switched.accountId).not.toBe(accountA.accountId);
    expect((await apiB.get("/api/applyflow/v2/extension/session", {
      headers: { authorization: `Bearer ${grant.token}` },
    })).status()).toBe(401);
    await accountB.close();
  });
});
