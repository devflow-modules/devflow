import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type APIRequestContext, type Route } from "@playwright/test";

const E2E_SECRET = process.env.APPLYFLOW_E2E_SECRET || "applyflow-e2e-local-only-secret";
const ACCOUNT_A = "e2e_applyflow_switch_a";
const ACCOUNT_B = "e2e_applyflow_switch_b";
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
  return (await response.json()) as { accountId: string };
}

async function logout(request: APIRequestContext) {
  const response = await request.post("/api/applyflow/e2e/session", {
    headers: { "content-type": "application/json" },
    data: { action: "logout" },
  });
  expect(response.status()).toBe(200);
}

test.describe("account switch with delayed personal responses", () => {
  test("late reads from A do not contaminate B; in-flight write stays on A", async ({ page }) => {
    const api = page.request;
    const accountA = await login(api, ACCOUNT_A);

    expect((await api.put("/api/applyflow/v2/profile", { data: { library: library("Conta A switch") } })).status()).toBe(
      200,
    );
    expect(
      (
        await api.put("/api/applyflow/v2/contacts", {
          data: {
            contact: {
              id: "contact-switch-a",
              name: "Contact A Only",
              type: "engineering_manager",
              status: "not_contacted",
              createdAt: "2026-09-09T12:00:00.000Z",
              updatedAt: "2026-09-09T12:00:00.000Z",
            },
          },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await api.put("/api/applyflow/v2/responses", {
          data: {
            detection: {
              id: "detect-switch-a",
              emailId: "msg-switch-a",
              provider: "gmail",
              headline: "Resposta A",
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
        })
      ).status(),
    ).toBe(200);

    const pendingGets: Route[] = [];
    let holdGets = true;
    const holdPersonalGets = async (route: Route) => {
      if (route.request().method() === "GET" && holdGets) {
        pendingGets.push(route);
        return;
      }
      await route.continue();
    };
    await page.route("**/api/applyflow/v2/profile", holdPersonalGets);
    await page.route("**/api/applyflow/v2/contacts", holdPersonalGets);
    await page.route("**/api/applyflow/v2/responses", holdPersonalGets);
    await page.route("**/api/applyflow/v2/analytics", holdPersonalGets);

    await page.goto("/dashboard");
    await expect.poll(() => pendingGets.length, { timeout: 15_000 }).toBeGreaterThan(0);

    // Soft session switch keeps the document alive so A's delayed responses can still complete.
    await logout(api);
    const accountB = await login(api, ACCOUNT_B);
    expect(accountB.accountId).not.toBe(accountA.accountId);

    // Real product logout path afterwards to clear UI auth chrome, then open B dashboard.
    holdGets = false;
    const latePayload = {
      profile: {
        library: library("Conta A switch"),
        version: 1,
      },
      contacts: [{ id: "contact-switch-a", name: "Contact A Only" }],
      interactions: [],
      responses: [{ detection: { id: "detect-switch-a", headline: "Resposta A" } }],
      events: [{ id: "evt-a", applicationId: "app-a", type: "applied", occurredAt: "2026-10-05T12:00:00.000Z" }],
    };
    for (const route of pendingGets.splice(0)) {
      const url = route.request().url();
      if (url.includes("/profile")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ profile: latePayload.profile }),
        });
      } else if (url.includes("/contacts")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ contacts: latePayload.contacts, interactions: [], versions: {} }),
        });
      } else if (url.includes("/responses")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ responses: latePayload.responses }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ events: latePayload.events, outcomes: [], efforts: [] }),
        });
      }
    }

    await page.goto("/account");
    await page.getByTestId("applyflow-logout").click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await login(api, ACCOUNT_B);
    await page.goto("/dashboard");
    await expect(page.getByText(/Visão geral|Descobrir|Oportunidades/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await page.waitForTimeout(400);

    expect(((await (await api.get("/api/applyflow/v2/profile")).json()) as { profile: unknown }).profile).toBeNull();
    expect(((await (await api.get("/api/applyflow/v2/contacts")).json()) as { contacts: unknown[] }).contacts).toEqual([]);
    expect(((await (await api.get("/api/applyflow/v2/responses")).json()) as { responses: unknown[] }).responses).toEqual(
      [],
    );

    const contamination = await page.evaluate((ids) => {
      const values = Object.keys(window.localStorage).map((key) => ({
        key,
        value: window.localStorage.getItem(key) ?? "",
      }));
      const scopedB = values.filter((entry) => entry.key.includes(ids.accountB));
      const scopedA = values.filter((entry) => entry.key.includes(ids.accountA));
      const body = document.body.innerText;
      return {
        aKeysWithAPayload: scopedA.filter(
          (entry) =>
            entry.value.includes("Conta A switch") ||
            entry.value.includes("Contact A Only") ||
            entry.value.includes("Resposta A"),
        ).length,
        bKeysWithAPayload: scopedB.filter(
          (entry) =>
            entry.value.includes("Conta A switch") ||
            entry.value.includes("Contact A Only") ||
            entry.value.includes("Resposta A"),
        ).length,
        visibleA: body.includes("Conta A switch") || body.includes("Contact A Only") || body.includes("Resposta A"),
        legacy: window.localStorage.getItem("APPLYFLOW_RESUME_LIBRARY_V1"),
      };
    }, { accountA: accountA.accountId, accountB: accountB.accountId });

    expect(contamination.bKeysWithAPayload).toBe(0);
    expect(contamination.visibleA).toBe(false);
    expect(contamination.legacy).toBeNull();

    await page.unroute("**/api/applyflow/v2/profile");
    await page.unroute("**/api/applyflow/v2/contacts");
    await page.unroute("**/api/applyflow/v2/responses");
    await page.unroute("**/api/applyflow/v2/analytics");

    // --- In-flight write: hold PUT from A, switch to B, release; B must not own the payload ---
    await logout(api);
    await login(api, ACCOUNT_A);
    await page.goto("/dashboard");
    await expect(page.getByText(/Visão geral|Descobrir|Oportunidades/i).first()).toBeVisible({
      timeout: 30_000,
    });

    let releasePut: () => void = () => undefined;
    const putGate = new Promise<void>((resolveGate) => {
      releasePut = resolveGate;
    });
    let putSeen = false;
    await page.route("**/api/applyflow/v2/profile", async (route) => {
      if (route.request().method() === "PUT") {
        putSeen = true;
        await putGate;
        await route.continue();
        return;
      }
      await route.continue();
    });

    const putPromise = page.evaluate(async (nextLibrary) => {
      try {
        const response = await fetch("/api/applyflow/v2/profile", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ library: nextLibrary }),
        });
        return { ok: response.ok, status: response.status, aborted: false as boolean };
      } catch (error) {
        return {
          ok: false,
          status: 0,
          aborted: error instanceof DOMException && error.name === "AbortError",
        };
      }
    }, library("Conta A late write"));

    await expect.poll(() => putSeen, { timeout: 10_000 }).toBe(true);

    await page.goto("/account");
    await page.getByTestId("applyflow-logout").click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await login(api, ACCOUNT_B);
    await page.goto("/dashboard");

    releasePut();
    const putResult = await putPromise;

    expect(((await (await api.get("/api/applyflow/v2/profile")).json()) as { profile: unknown }).profile).toBeNull();

    await logout(api);
    await login(api, ACCOUNT_A);
    const profileA = (await (await api.get("/api/applyflow/v2/profile")).json()) as {
      profile: { library: { variants: Array<{ name: string }> } } | null;
    };

    if (putResult.ok) {
      expect(profileA.profile?.library.variants[0]?.name).toBe("Conta A late write");
    } else {
      // Aborting the client request does not prove server rollback; only that B stayed clean.
      expect(putResult.aborted || putResult.status === 401 || putResult.status === 0).toBe(true);
      expect(profileA.profile?.library.variants[0]?.name).toMatch(/Conta A/);
    }

    await page.goto("/dashboard");
    await expect(page.getByText("Conta A late write")).toHaveCount(0);
    await expect(page.getByText("Contact A Only")).toHaveCount(0);
  });
});
