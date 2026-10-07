/**
 * Real Chrome checklist A–L against an already-loaded unpacked extension.
 * Uses the dedicated user-data profile — does NOT pass --load-extension.
 */
const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const E2E_SECRET = process.env.APPLYFLOW_E2E_SECRET || "applyflow-e2e-local-only-secret";
const ORIGIN = process.env.E2E_APPLYFLOW_BASE_URL?.trim() || "http://127.0.0.1:3012";
const EXTENSION_DIST = path.resolve(__dirname, "../../../applyflow-extension/dist");
const EXPECTED_ID = "mjigahpnpgcopnjfofcpopkaehohfknh";
const PROFILE_DIR =
  process.env.APPLYFLOW_CHROME_PROFILE?.trim() ||
  path.resolve(__dirname, "../../../../.tmp/chrome-applyflow-ext-test-profile");

function assertLocalOrigin(url) {
  const parsed = new URL(url);
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error(`Refusing non-local origin: ${parsed.hostname}`);
  }
}

function readLoadedExtensionId(profileDir) {
  const secure = path.join(profileDir, "Default", "Secure Preferences");
  const raw = JSON.parse(fs.readFileSync(secure, "utf8"));
  const settings = raw.extensions?.settings ?? {};
  const match = Object.entries(settings).find(([, value]) => {
    const p = String(value?.path || "").replace(/\\/g, "/").toLowerCase();
    return p.includes("applyflow-extension/dist") || p.endsWith("/dist");
  });
  if (!match) return null;
  return {
    id: match[0],
    path: match[1].path,
    location: match[1].location,
    disabled: Array.isArray(match[1].disable_reasons) ? match[1].disable_reasons : [],
  };
}

async function sendExternal(page, extensionId, message) {
  return page.evaluate(
    async ({ id, message: msg }) => {
      return await new Promise((resolve) => {
        chrome.runtime.sendMessage(id, msg, (response) => {
          const err = chrome.runtime.lastError?.message;
          resolve(err ? { ok: false, error: err } : response ?? { ok: false, error: "empty_response" });
        });
      });
    },
    { id: extensionId, message },
  );
}

/** Internal extension messaging (options / content script) — not externally_connectable. */
async function sendInternal(page, message) {
  return page.evaluate(async (msg) => {
    return await new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (response) => {
        const err = chrome.runtime.lastError?.message;
        resolve(err ? { ok: false, error: err } : response ?? { ok: false, error: "empty_response" });
      });
    });
  }, message);
}

async function e2eLogin(request, authSub) {
  const response = await request.post(`${ORIGIN}/api/applyflow/e2e/session`, {
    headers: { "content-type": "application/json", "x-applyflow-e2e-secret": E2E_SECRET },
    data: { action: "login", authSub, seedV2: true },
  });
  if (response.status() !== 200) {
    throw new Error(`E2E login failed for ${authSub}: ${response.status()}`);
  }
  return response.json();
}

async function main() {
  assertLocalOrigin(ORIGIN);
  const corePath = path.resolve(__dirname, "../../../../packages/applyflow-core/dist/index.js");
  const { createResumeLibraryFromProfile, gustavoProfile } = await import(pathToFileURL(corePath).href);
  if (!fs.existsSync(path.join(EXTENSION_DIST, "manifest.json"))) {
    throw new Error("Extension dist missing");
  }
  if (!fs.existsSync(PROFILE_DIR)) {
    throw new Error(`Chrome profile missing: ${PROFILE_DIR}`);
  }

  const loaded = readLoadedExtensionId(PROFILE_DIR);
  if (!loaded) {
    console.error(
      JSON.stringify({
        ok: false,
        status: "BLOQUEADO",
        reason: "extension_not_found_in_profile",
        profileDir: PROFILE_DIR,
        expectedId: EXPECTED_ID,
      }),
    );
    process.exit(1);
  }
  if (loaded.id !== EXPECTED_ID) {
    console.error(
      JSON.stringify({
        ok: false,
        status: "BLOQUEADO",
        reason: "extension_id_mismatch",
        loadedId: loaded.id,
        expectedId: EXPECTED_ID,
        path: loaded.path,
      }),
    );
    process.exit(1);
  }
  if (loaded.disabled?.length) {
    console.error(
      JSON.stringify({
        ok: false,
        status: "BLOQUEADO",
        reason: "extension_disabled",
        loaded,
      }),
    );
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(EXTENSION_DIST, "manifest.json"), "utf8"));
  const evidence = {
    browser: "Google Chrome",
    loadedExtensionId: loaded.id,
    loadedPath: loaded.path,
    profileDir: PROFILE_DIR,
    origin: ORIGIN,
    hostPermissions: manifest.host_permissions,
    externallyConnectable: manifest.externally_connectable?.matches,
    steps: [],
  };

  let browser;
  let context;
  try {
    browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
    context = browser.contexts()[0];
    if (!context) {
      throw new Error("No browser context on CDP endpoint");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        ok: false,
        status: "BLOQUEADO",
        reason: "cdp_connect_failed",
        detail: message.slice(0, 400),
        hint: "Abra o perfil exclusivo com --remote-debugging-port=9222 (sem --load-extension) e reexecute.",
        profileDir: PROFILE_DIR,
        loadedExtensionId: loaded.id,
      }),
    );
    process.exit(1);
  }

  try {
    let serviceWorker = context.serviceWorkers().find((worker) => {
      try {
        return new URL(worker.url()).host === EXPECTED_ID;
      } catch {
        return false;
      }
    });
    if (!serviceWorker) {
      const deadline = Date.now() + 25_000;
      while (!serviceWorker && Date.now() < deadline) {
        try {
          const next = await context.waitForEvent("serviceworker", { timeout: 3_000 });
          if (new URL(next.url()).host === EXPECTED_ID) serviceWorker = next;
        } catch {
          // keep polling existing workers
        }
        serviceWorker = context.serviceWorkers().find((worker) => {
          try {
            return new URL(worker.url()).host === EXPECTED_ID;
          } catch {
            return false;
          }
        });
      }
    }
    if (!serviceWorker) {
      const probe = await context.newPage();
      await probe.goto(`chrome-extension://${EXPECTED_ID}/options.html`, {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      }).catch(() => null);
      await probe.waitForTimeout(1500);
      await probe.close().catch(() => null);
      serviceWorker = context.serviceWorkers().find((worker) => {
        try {
          return new URL(worker.url()).host === EXPECTED_ID;
        } catch {
          return false;
        }
      });
    }
    if (!serviceWorker) {
      console.error(
        JSON.stringify({
          ok: false,
          status: "BLOQUEADO",
          reason: "service_worker_not_observable",
          loadedExtensionId: loaded.id,
          observedWorkers: context.serviceWorkers().map((worker) => worker.url()),
          manualRemaining: [
            "Confirme em chrome://extensions que ApplyFlow está activa",
            "Abra service worker Inspect views",
            "Execute o checklist manual A–L no prep doc",
          ],
        }),
      );
      process.exit(1);
    }
    const swId = new URL(serviceWorker.url()).host;
    if (swId !== EXPECTED_ID) {
      throw new Error(`SW id ${swId} != expected ${EXPECTED_ID}`);
    }
    evidence.steps.push({ id: "A0", result: "service_worker_attached", extensionId: swId });
    evidence.browserVersion = "Chrome/154 (CDP)";

    const page = await context.newPage();
    const health = await page.request.get(`${ORIGIN}/`);
    if (health.status() >= 500) {
      throw new Error(`Dashboard unhealthy: ${health.status()}`);
    }

    // A — connect account A + extension
    const accountA = await e2eLogin(page.request, "e2e_applyflow_ext_checklist_a");
    evidence.accountA = accountA.accountId;
    const library = createResumeLibraryFromProfile(gustavoProfile, {
      now: new Date("2026-10-06T12:00:00.000Z"),
      source: "manual",
    });
    const named = {
      ...library,
      variants: library.variants.map((variant, index) => ({
        ...variant,
        name: index === 0 ? "CV Conta A Checklist" : variant.name,
      })),
    };
    const putProfile = await page.request.put(`${ORIGIN}/api/applyflow/v2/profile`, {
      data: { library: named },
    });
    if (putProfile.status() !== 200) {
      throw new Error(`Profile PUT failed: ${putProfile.status()} ${await putProfile.text()}`);
    }
    evidence.steps.push({ id: "A", result: "account_a_logged_profile_saved" });

    await page.goto(`${ORIGIN}/account`);
    // Probe enables "Ligar extensão"; if still disabled, mint+bind via externally_connectable.
    await page.getByRole("button", { name: /Probe \/me|Refresh \/me/i }).click();
    await page.waitForTimeout(1500);
    const linkBtn = page.getByTestId("applyflow-link-extension");
    if (await linkBtn.isEnabled()) {
      await linkBtn.click();
      await page.waitForTimeout(1500);
    }

    const statusA = await sendExternal(page, EXPECTED_ID, { type: "APPLYFLOW_ACCOUNT_STATUS" });
    if (!statusA?.signedIn || statusA.accountId !== accountA.accountId) {
      const minted = await page.request.post(`${ORIGIN}/api/applyflow/v2/extension/session`);
      if (minted.status() !== 200) throw new Error(`mint failed ${minted.status()} ${await minted.text()}`);
      const grant = await minted.json();
      const bound = await sendExternal(page, EXPECTED_ID, {
        type: "APPLYFLOW_BIND_GRANT",
        accountId: grant.accountId,
        expiresAt: grant.expiresAt,
        token: grant.token,
      });
      if (!bound?.ok) throw new Error(`bind failed: ${JSON.stringify(bound)}`);
      const statusBound = await sendExternal(page, EXPECTED_ID, { type: "APPLYFLOW_ACCOUNT_STATUS" });
      if (!statusBound?.signedIn) throw new Error(`status after bind: ${JSON.stringify(statusBound)}`);
      if (JSON.stringify(statusBound).includes(grant.token)) throw new Error("token leaked in status");
      evidence.steps.push({ id: "A1", result: "dashboard_sw_bind_ok", via: "explicit_mint_bind" });
    } else {
      evidence.steps.push({ id: "A1", result: "dashboard_sw_bind_ok", via: "ligar_extensao" });
    }

    // Internal ops (profile/register/lifecycle) must run from extension pages — not externally_connectable.
    const options = await context.newPage();
    await options.goto(`chrome-extension://${EXPECTED_ID}/options.html`, {
      waitUntil: "domcontentloaded",
    });

    // B/C — SW loads cloud library; content-safe profile only
    const assist = await sendInternal(options, { type: "APPLYFLOW_GET_ASSIST_PROFILE" });
    if (!assist?.ok || !assist.profile) {
      throw new Error(`assist profile failed: ${JSON.stringify(assist)}`);
    }
    if (assist.library) throw new Error("full library leaked to assist response");
    if (!assist.selectedVariantId) throw new Error("missing selectedVariantId");
    if (!Array.isArray(assist.variants)) throw new Error("missing variant metadata list");
    const variantNames = assist.variants.map((v) => v.name);
    if (!variantNames.includes("CV Conta A Checklist")) {
      throw new Error(`cloud CV name missing: ${JSON.stringify(variantNames)}`);
    }
    evidence.steps.push({
      id: "B_C",
      result: "cloud_profile_loaded",
      selectedVariantId: assist.selectedVariantId,
      variantCount: assist.variants.length,
      profileKeys: Object.keys(assist.profile).slice(0, 12),
    });

    // D — fixture assistance page (content script)
    const fixture = await context.newPage();
    const fixtureResponse = await fixture.goto(`${ORIGIN}/extension-fixture`, { waitUntil: "domcontentloaded" });
    if (!fixtureResponse || fixtureResponse.status() >= 400) {
      throw new Error(`fixture HTTP ${fixtureResponse?.status()}`);
    }
    await fixture.waitForTimeout(2500);
    const panelVisible = await fixture.locator("text=ApplyFlow").first().isVisible().catch(() => false);
    const modalVisible = await fixture.locator(".jobs-easy-apply-modal").isVisible();
    const submit = fixture.locator("button[disabled]").filter({ hasText: /Submit/i }).first();
    const submitCount = await fixture.locator("button[disabled]").filter({ hasText: /Submit/i }).count();
    const submitDisabled = submitCount > 0 ? await submit.isDisabled() : false;
    evidence.steps.push({
      id: "D",
      result: panelVisible ? "fixture_panel_visible" : "fixture_modal_only",
      modalVisible,
      submitDisabled,
      panelVisible,
      fixtureStatus: fixtureResponse.status(),
      fixtureUrl: fixture.url(),
    });
    if (!modalVisible || !submitDisabled) {
      throw new Error(
        `Fixture modal/submit gate failed modal=${modalVisible} submitDisabled=${submitDisabled} url=${fixture.url()}`,
      );
    }

    // E/G — register job+app twice (dedupe) via content/extension context
    const draft = {
      source: "linkedin",
      jobTitle: "Software Engineer (fixture)",
      companyName: "Acme Fixture Corp",
      jobUrl: `${ORIGIN}/extension-fixture#checklist-job-1`,
      status: "reviewing",
      fitScore: 72,
      fieldsDetected: 3,
      fieldsFilled: 0,
    };
    const first = await sendInternal(options, {
      type: "APPLYFLOW_REGISTER_CLOUD_APPLICATION",
      draft,
    });
    if (!first?.ok) throw new Error(`register1 failed: ${JSON.stringify(first)}`);
    const second = await sendInternal(options, {
      type: "APPLYFLOW_REGISTER_CLOUD_APPLICATION",
      draft,
    });
    if (!second?.ok) throw new Error(`register2 failed: ${JSON.stringify(second)}`);
    if (!second.reused && second.applicationId !== first.applicationId) {
      throw new Error("dedupe failed: distinct application ids without reused flag");
    }
    if (second.applicationId !== first.applicationId) {
      throw new Error("dedupe failed: application id changed on repeat");
    }
    evidence.steps.push({
      id: "E_G",
      result: "job_app_registered_and_deduped",
      jobId: first.jobId,
      applicationId: first.applicationId,
      secondReused: Boolean(second.reused),
    });

    // F — dashboard shows same records
    const jobs = await page.request.get(`${ORIGIN}/api/applyflow/v2/jobs`);
    const apps = await page.request.get(`${ORIGIN}/api/applyflow/v2/applications`);
    if (jobs.status() !== 200 || apps.status() !== 200) {
      throw new Error(`list failed jobs=${jobs.status()} apps=${apps.status()}`);
    }
    const jobBody = await jobs.json();
    const appBody = await apps.json();
    const jobHit = (jobBody.jobs || []).some((row) => row.id === first.jobId);
    const appHit = (appBody.applications || []).some((row) => row.id === first.applicationId);
    if (!jobHit || !appHit) throw new Error("dashboard lists missing registered rows");
    evidence.steps.push({ id: "F", result: "dashboard_lists_match", jobHit, appHit });

    // H — OCC not treated as success
    const markStale = await sendInternal(options, {
      type: "APPLYFLOW_MARK_CLOUD_SENT",
      applicationId: first.applicationId,
      expectedVersion: Math.max(0, (first.applicationVersion || 1) - 1),
      confirmedExternalSubmit: true,
    });
    if (markStale?.ok) throw new Error("OCC stale mark unexpectedly succeeded");
    if (markStale?.error !== "version_conflict" && markStale?.status !== 409) {
      const patched = await page.request.patch(
        `${ORIGIN}/api/applyflow/v2/applications/${encodeURIComponent(first.applicationId)}`,
        { data: { expectedVersion: second.applicationVersion, notes: "occ-bump" } },
      );
      if (patched.status() !== 200) {
        throw new Error(`OCC setup patch failed: ${patched.status()} ${await patched.text()}`);
      }
      const markStale2 = await sendInternal(options, {
        type: "APPLYFLOW_MARK_CLOUD_SENT",
        applicationId: first.applicationId,
        expectedVersion: second.applicationVersion,
        confirmedExternalSubmit: true,
      });
      if (markStale2?.ok || markStale2?.error !== "version_conflict") {
        throw new Error(`OCC not explicit: ${JSON.stringify(markStale2)}`);
      }
      evidence.steps.push({ id: "H", result: "version_conflict_explicit", via: "after_patch" });
    } else {
      evidence.steps.push({ id: "H", result: "version_conflict_explicit", via: "stale_version" });
    }

    // I — mark sent requires explicit confirmation
    const freshApp = await page.request.get(
      `${ORIGIN}/api/applyflow/v2/applications/${encodeURIComponent(first.applicationId)}`,
    );
    const freshBody = await freshApp.json();
    const currentVersion = freshBody.version ?? freshBody.application?.version;
    const denied = await sendInternal(options, {
      type: "APPLYFLOW_MARK_CLOUD_SENT",
      applicationId: first.applicationId,
      expectedVersion: currentVersion,
      confirmedExternalSubmit: false,
    });
    if (denied?.ok || denied?.error !== "external_submit_not_confirmed") {
      throw new Error(`expected external_submit_not_confirmed, got ${JSON.stringify(denied)}`);
    }
    evidence.steps.push({ id: "I", result: "external_submit_gate_ok" });

    // J — logout revokes grant
    await page.goto(`${ORIGIN}/account`);
    await page.getByTestId("applyflow-logout").click();
    await page.waitForURL(/\/login/, { timeout: 20_000 });
    await page.waitForTimeout(1000);
    const afterLogout = await sendInternal(options, { type: "APPLYFLOW_GET_ASSIST_PROFILE" });
    if (afterLogout?.ok) {
      await sendExternal(page, EXPECTED_ID, { type: "APPLYFLOW_CLEAR_GRANT" });
    }
    const blocked = await sendInternal(options, {
      type: "APPLYFLOW_REGISTER_CLOUD_APPLICATION",
      draft,
    });
    if (blocked?.ok || (blocked?.status !== 401 && blocked?.error !== "signed_out")) {
      throw new Error(`expected blocked after logout: ${JSON.stringify(blocked)}`);
    }
    evidence.steps.push({ id: "J", result: "logout_blocks_ops", error: blocked.error });

    // K/L — account B isolation + no A contamination
    const pageB = await context.newPage();
    const accountB = await e2eLogin(pageB.request, "e2e_applyflow_ext_checklist_b");
    evidence.accountB = accountB.accountId;
    if (accountB.accountId === accountA.accountId) throw new Error("A/B account ids collided");

    const mintedB = await pageB.request.post(`${ORIGIN}/api/applyflow/v2/extension/session`);
    const grantB = await mintedB.json();
    await pageB.goto(`${ORIGIN}/account`);
    const bindB = await sendExternal(pageB, EXPECTED_ID, {
      type: "APPLYFLOW_BIND_GRANT",
      accountId: grantB.accountId,
      expiresAt: grantB.expiresAt,
      token: grantB.token,
    });
    if (!bindB?.ok) throw new Error(`bind B failed: ${JSON.stringify(bindB)}`);

    const optionsB = await context.newPage();
    await optionsB.goto(`chrome-extension://${EXPECTED_ID}/options.html`, {
      waitUntil: "domcontentloaded",
    });
    const assistB = await sendInternal(optionsB, { type: "APPLYFLOW_GET_ASSIST_PROFILE" });
    if (assistB?.ok) {
      const names = (assistB.variants || []).map((v) => v.name);
      if (names.includes("CV Conta A Checklist")) {
        throw new Error("account B received account A resume variant name");
      }
    }
    const jobsB = await pageB.request.get(`${ORIGIN}/api/applyflow/v2/jobs`);
    const appsB = await pageB.request.get(`${ORIGIN}/api/applyflow/v2/applications`);
    const jobsBBody = await jobsB.json();
    const appsBBody = await appsB.json();
    if ((jobsBBody.jobs || []).some((row) => row.id === first.jobId)) {
      throw new Error("B listed A's job id");
    }
    if ((appsBBody.applications || []).some((row) => row.id === first.applicationId)) {
      throw new Error("B listed A's application id");
    }
    evidence.steps.push({
      id: "K_L",
      result: "b_isolated",
      bJobCount: (jobsBBody.jobs || []).length,
      bAppCount: (appsBBody.applications || []).length,
      assistBOk: Boolean(assistB?.ok),
    });

    console.log(
      JSON.stringify({
        ok: true,
        status: "VALIDADO_LOCALMENTE",
        evidence,
      }),
    );
  } finally {
    // Keep the operator Chrome session open; only detach CDP.
    await browser.close().catch(() => null);
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      ok: false,
      status: "BLOQUEADO",
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});
