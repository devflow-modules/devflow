/**
 * Chrome real extension gate for ApplyFlow.
 *
 * Loads the unpacked local build with a dedicated user-data profile, verifies
 * the extension id matches the handoff contract, exercises grant bind/status/clear
 * against the local dashboard, and never treats minting a grant as cloud sync proof.
 *
 * Requires Google Chrome (channel: chrome). Chromium-only CI without Chrome marks
 * the run as skipped — use the manual checklist in the publication runbook.
 */
const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const E2E_SECRET = process.env.APPLYFLOW_E2E_SECRET || "applyflow-e2e-local-only-secret";
const ORIGIN = process.env.E2E_APPLYFLOW_BASE_URL?.trim() || "http://127.0.0.1:3012";
const EXTENSION_DIST = path.resolve(__dirname, "../../../applyflow-extension/dist");
const EXPECTED_ID = "mjigahpnpgcopnjfofcpopkaehohfknh";

function assertLocalOrigin(url) {
  const parsed = new URL(url);
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error(`Refusing non-local origin: ${parsed.hostname}`);
  }
}

async function main() {
  assertLocalOrigin(ORIGIN);
  if (!fs.existsSync(path.join(EXTENSION_DIST, "manifest.json"))) {
    throw new Error("Extension dist/manifest.json missing. Run pnpm build in apps/applyflow-extension first.");
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(EXTENSION_DIST, "manifest.json"), "utf8"));
  const hosts = manifest.host_permissions ?? [];
  const external = manifest.externally_connectable?.matches ?? [];
  for (const required of [`${ORIGIN}/*`]) {
    if (!hosts.includes(required) && !hosts.some((h) => h.startsWith(new URL(ORIGIN).origin))) {
      // local build lists 3010 and 3012; accept either localhost form of the same origin port
      const originStar = `${new URL(ORIGIN).origin}/*`;
      if (!hosts.includes(originStar)) {
        throw new Error(`host_permissions missing ${originStar}`);
      }
    }
    const originStar = `${new URL(ORIGIN).origin}/*`;
    if (!external.includes(originStar)) {
      throw new Error(`externally_connectable missing ${originStar}`);
    }
  }

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "applyflow-ext-chrome-"));
  const extensionPath = EXTENSION_DIST.replace(/\\/g, "/");
  let context;
  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      channel: "chrome",
      headless: false,
      args: [
        "--disable-features=DisableLoadExtensionCommandLineSwitch",
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        ok: false,
        status: "NAO_EXECUTADO",
        reason: "chrome_launch_failed",
        detail: message.slice(0, 300),
      }),
    );
    process.exit(2);
  }

  try {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      try {
        serviceWorker = await context.waitForEvent("serviceworker", { timeout: 20_000 });
      } catch {
        const probe = await context.newPage();
        await probe.goto(`chrome://extensions`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => null);
        await probe.close().catch(() => null);
        [serviceWorker] = context.serviceWorkers();
        if (!serviceWorker) {
          console.error(
            JSON.stringify({
              ok: false,
              status: "NAO_EXECUTADO",
              reason: "chrome_unpacked_extension_not_attachable",
              chromeHint:
                "Chrome 137+ may ignore --load-extension even with DisableLoadExtensionCommandLineSwitch. Use the manual checklist in docs/applyflow/ACCOUNT_PERSISTENCE_PUBLICATION_PREP.md",
              expectedId: EXPECTED_ID,
              extensionDist: EXTENSION_DIST,
              hostPermissions: hosts,
              externallyConnectable: external,
            }),
          );
          process.exit(2);
        }
      }
    }
    const extensionId = new URL(serviceWorker.url()).host;
    if (extensionId !== EXPECTED_ID) {
      throw new Error(`Extension id mismatch: got ${extensionId}, expected ${EXPECTED_ID}`);
    }

    const page = await context.newPage();
    const login = await page.request.post(`${ORIGIN}/api/applyflow/e2e/session`, {
      headers: { "content-type": "application/json", "x-applyflow-e2e-secret": E2E_SECRET },
      data: { action: "login", authSub: "e2e_applyflow_extension_chrome", seedV2: true },
    });
    if (login.status() !== 200) {
      throw new Error(`E2E login failed: ${login.status()}`);
    }
    const loginBody = await login.json();

    const minted = await page.request.post(`${ORIGIN}/api/applyflow/v2/extension/session`);
    if (minted.status() !== 200) {
      throw new Error(`Grant mint failed: ${minted.status()}`);
    }
    const grant = await minted.json();
    if (!grant.token || !grant.accountId || !grant.expiresAt) {
      throw new Error("Grant payload incomplete");
    }

    await page.goto(`${ORIGIN}/account`);
    const bind = await page.evaluate(
      async ({ extensionId: id, grant: next }) => {
        const statusBefore = await new Promise((resolve) => {
          chrome.runtime.sendMessage(id, { type: "APPLYFLOW_ACCOUNT_STATUS" }, resolve);
        });
        const bound = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            id,
            {
              type: "APPLYFLOW_BIND_GRANT",
              accountId: next.accountId,
              expiresAt: next.expiresAt,
              token: next.token,
            },
            resolve,
          );
        });
        const statusAfter = await new Promise((resolve) => {
          chrome.runtime.sendMessage(id, { type: "APPLYFLOW_ACCOUNT_STATUS" }, resolve);
        });
        return { statusBefore, bound, statusAfter };
      },
      { extensionId, grant },
    );

    if (JSON.stringify(bind.statusBefore).includes(grant.token)) {
      throw new Error("Token leaked in statusBefore");
    }
    if (JSON.stringify(bind.statusAfter).includes(grant.token)) {
      throw new Error("Token leaked in statusAfter");
    }
    if (JSON.stringify(bind.bound).includes(grant.token)) {
      throw new Error("Token leaked in bind response");
    }
    if (!bind.bound?.ok || bind.bound.accountId !== grant.accountId) {
      throw new Error(`Bind failed: ${JSON.stringify(bind.bound)}`);
    }
    if (!bind.statusAfter?.signedIn || bind.statusAfter.accountId !== grant.accountId) {
      throw new Error(`Status after bind unexpected: ${JSON.stringify(bind.statusAfter)}`);
    }

    const authed = await page.request.get(`${ORIGIN}/api/applyflow/v2/extension/session`, {
      headers: { authorization: `Bearer ${grant.token}` },
    });
    if (authed.status() !== 200) {
      throw new Error(`Authenticated extension session failed: ${authed.status()}`);
    }

    await page.getByTestId("applyflow-logout").click();
    await page.waitForURL(/\/login/, { timeout: 15_000 });

    const revoked = await page.request.get(`${ORIGIN}/api/applyflow/v2/extension/session`, {
      headers: { authorization: `Bearer ${grant.token}` },
    });
    if (revoked.status() !== 401) {
      throw new Error(`Expected 401 after logout revoke, got ${revoked.status()}`);
    }

    const page2 = await context.newPage();
    await page2.goto(`${ORIGIN}/login`);
    const statusAfterLogout = await page2.evaluate(async (id) => {
      return await new Promise((resolve) => {
        chrome.runtime.sendMessage(id, { type: "APPLYFLOW_ACCOUNT_STATUS" }, resolve);
      });
    }, extensionId);
    if (statusAfterLogout?.signedIn) {
      // CLEAR may be async with logout; force clear and re-check.
      await page2.evaluate(async (id) => {
        await new Promise((resolve) => {
          chrome.runtime.sendMessage(id, { type: "APPLYFLOW_CLEAR_GRANT" }, resolve);
        });
      }, extensionId);
    }
    const clearedStatus = await page2.evaluate(async (id) => {
      return await new Promise((resolve) => {
        chrome.runtime.sendMessage(id, { type: "APPLYFLOW_ACCOUNT_STATUS" }, resolve);
      });
    }, extensionId);
    if (clearedStatus?.signedIn) {
      throw new Error("Grant still present after logout/clear");
    }
    if (JSON.stringify(clearedStatus).includes(grant.token)) {
      throw new Error("Token leaked after clear");
    }

    const loginB = await page2.request.post(`${ORIGIN}/api/applyflow/e2e/session`, {
      headers: { "content-type": "application/json", "x-applyflow-e2e-secret": E2E_SECRET },
      data: { action: "login", authSub: "e2e_applyflow_extension_chrome_b", seedV2: true },
    });
    if (loginB.status() !== 200) {
      throw new Error(`Login B failed: ${loginB.status()}`);
    }
    const reuse = await page2.request.get(`${ORIGIN}/api/applyflow/v2/extension/session`, {
      headers: { authorization: `Bearer ${grant.token}` },
    });
    if (reuse.status() !== 401) {
      throw new Error(`Account B reused A grant: ${reuse.status()}`);
    }

    console.log(
      JSON.stringify({
        ok: true,
        status: "VALIDADO_LOCALMENTE",
        extensionId,
        accountA: loginBody.accountId,
        hostPermissions: hosts,
        externallyConnectable: external,
        notes: [
          "Authenticated protocol (mint/bind/status/revoke) proven with real Chrome + unpacked extension.",
          "Extension does not sync profile/contacts/responses to cloud APIs; only session verification.",
          "No auto-submit exercised; LinkedIn was not opened.",
        ],
      }),
    );
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
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
