import {
  OPEN_OPTIONS_MESSAGE,
  type OpenOptionsResponse,
  openOptionsPageInExtensionContext,
} from "../runtime/open-options-page.js";
import {
  GENERATE_AI_MESSAGE,
  GET_PUBLIC_SETTINGS_MESSAGE,
  TEST_AI_MESSAGE,
  isExtensionPageSender,
  isTrustedExtensionSender,
  parseGenerateAiRequest,
  parseGetPublicSettingsRequest,
  parseTestAiRequest,
  type GenerateAiResponse,
  type TestAiResponse,
} from "../runtime/ai-messages.js";
import {
  handleGenerateAiInServiceWorker,
  handleGetPublicSettingsInServiceWorker,
  handleTestAiInServiceWorker,
} from "./ai-generate-handler.js";
import { getApplyFlowPrivateSettings } from "../storage/applyflow-storage.js";
import {
  acceptExternalGrant,
  extensionAccountStatus,
  extensionOriginsForTarget,
  EXTENSION_GRANT_STORAGE_KEY,
  replaceStoredGrant,
  type StoredExtensionGrant,
} from "../account/extension-grant-bridge.js";
import { readExtensionAccount } from "../account/extension-account-client.js";
import {
  loadAccountResumeLibrary,
  markCloudApplicationSent,
  pickAccountProfile,
  profileFieldsForContentScript,
  registerCloudJobAndApplication,
  type AccountProfileSnapshot,
} from "../account/extension-cloud-sync.js";
import type { SaveApplicationInput } from "@devflow/applyflow-core";

const extensionAllowedOrigins = [
  ...extensionOriginsForTarget("local"),
  ...extensionOriginsForTarget("production"),
];

type AccountRuntimeState = {
  generation: number;
  snapshot: AccountProfileSnapshot | null;
  preferredVariantId: string | null;
  inflight: AbortController | null;
};

let accountRuntime: AccountRuntimeState = {
  generation: 0,
  snapshot: null,
  preferredVariantId: null,
  inflight: null,
};

function bumpAccountRuntime(): number {
  accountRuntime.inflight?.abort();
  accountRuntime = {
    generation: accountRuntime.generation + 1,
    snapshot: null,
    preferredVariantId: null,
    inflight: null,
  };
  return accountRuntime.generation;
}

async function readStoredGrant(): Promise<StoredExtensionGrant | null> {
  const stored = await chrome.storage.session.get(EXTENSION_GRANT_STORAGE_KEY);
  const grant = stored[EXTENSION_GRANT_STORAGE_KEY] as StoredExtensionGrant | undefined;
  if (!grant?.token || !grant.accountId || !grant.origin) return null;
  return grant;
}

async function writeStoredGrant(grant: StoredExtensionGrant | null): Promise<void> {
  if (!grant) {
    await chrome.storage.session.remove(EXTENSION_GRANT_STORAGE_KEY);
    return;
  }
  await chrome.storage.session.set({ [EXTENSION_GRANT_STORAGE_KEY]: grant });
}

async function ensureAccountSnapshot(generation: number): Promise<
  | { ok: true; snapshot: AccountProfileSnapshot }
  | { ok: false; error: string; status: number }
> {
  const grant = await readStoredGrant();
  if (!grant) return { ok: false, error: "signed_out", status: 401 };
  if (Date.parse(grant.expiresAt) <= Date.now()) {
    await writeStoredGrant(null);
    bumpAccountRuntime();
    return { ok: false, error: "signed_out", status: 401 };
  }
  if (accountRuntime.snapshot && accountRuntime.generation === generation) {
    return { ok: true, snapshot: accountRuntime.snapshot };
  }

  const controller = new AbortController();
  accountRuntime.inflight?.abort();
  accountRuntime.inflight = controller;
  const loaded = await loadAccountResumeLibrary({
    origin: grant.origin,
    token: grant.token,
    signal: controller.signal,
  });
  if (accountRuntime.generation !== generation) {
    return { ok: false, error: "aborted", status: 0 };
  }
  if (!loaded.ok) {
    if (loaded.status === 401) {
      await writeStoredGrant(null);
      bumpAccountRuntime();
    }
    return { ok: false, error: loaded.error, status: loaded.status };
  }
  const picked = pickAccountProfile(loaded.library, accountRuntime.preferredVariantId);
  if (!picked) return { ok: false, error: "profile_empty", status: 404 };
  const snapshot: AccountProfileSnapshot = {
    accountId: grant.accountId,
    generation,
    library: loaded.library,
    selectedVariantId: picked.selectedVariantId,
    profile: picked.profile,
  };
  accountRuntime.snapshot = snapshot;
  return { ok: true, snapshot };
}

function statusPayload(grant: StoredExtensionGrant | null) {
  return extensionAccountStatus(grant);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isTrustedExtensionSender(sender)) {
    return false;
  }

  if (message?.type === OPEN_OPTIONS_MESSAGE) {
    void openOptionsPageInExtensionContext()
      .then(() => sendResponse({ ok: true } satisfies OpenOptionsResponse))
      .catch((err: unknown) => {
        const error = err instanceof Error ? err.message : String(err);
        sendResponse({ ok: false, error } satisfies OpenOptionsResponse);
      });
    return true;
  }

  if (message?.type === "APPLYFLOW_ACCOUNT_STATUS") {
    void readStoredGrant().then((grant) => {
      sendResponse(statusPayload(grant));
    });
    return true;
  }

  if (message?.type === "APPLYFLOW_GET_ASSIST_PROFILE") {
    void (async () => {
      const generation = accountRuntime.generation;
      const ensured = await ensureAccountSnapshot(generation);
      if (!ensured.ok) {
        sendResponse({
          ok: false,
          error: ensured.error,
          status: ensured.status,
          reconnect:
            ensured.error === "signed_out"
              ? "Abra /account no dashboard e clique em Ligar extensão."
              : undefined,
        });
        return;
      }
      if (accountRuntime.generation !== generation) {
        sendResponse({ ok: false, error: "aborted", status: 0 });
        return;
      }
      sendResponse({
        ok: true,
        accountId: ensured.snapshot.accountId,
        selectedVariantId: ensured.snapshot.selectedVariantId,
        variants: ensured.snapshot.library.variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          isDefault: variant.isDefault,
        })),
        profile: profileFieldsForContentScript(ensured.snapshot.profile),
      });
    })();
    return true;
  }

  if (message?.type === "APPLYFLOW_SELECT_RESUME_VARIANT") {
    const variantId = typeof message.variantId === "string" ? message.variantId : "";
    void (async () => {
      const generation = accountRuntime.generation;
      accountRuntime.preferredVariantId = variantId || null;
      accountRuntime.snapshot = null;
      const ensured = await ensureAccountSnapshot(generation);
      if (!ensured.ok) {
        sendResponse({ ok: false, error: ensured.error, status: ensured.status });
        return;
      }
      sendResponse({
        ok: true,
        selectedVariantId: ensured.snapshot.selectedVariantId,
        profile: profileFieldsForContentScript(ensured.snapshot.profile),
      });
    })();
    return true;
  }

  if (message?.type === "APPLYFLOW_REGISTER_CLOUD_APPLICATION") {
    void (async () => {
      const grant = await readStoredGrant();
      if (!grant) {
        sendResponse({
          ok: false,
          error: "signed_out",
          status: 401,
          reconnect: "Abra /account no dashboard e clique em Ligar extensão.",
        });
        return;
      }
      const draft = message.draft as SaveApplicationInput | undefined;
      if (!draft || typeof draft !== "object") {
        sendResponse({ ok: false, error: "invalid_payload", status: 400 });
        return;
      }
      const generation = accountRuntime.generation;
      const controller = new AbortController();
      accountRuntime.inflight?.abort();
      accountRuntime.inflight = controller;
      const selectedVariantId =
        accountRuntime.snapshot?.selectedVariantId ?? accountRuntime.preferredVariantId ?? undefined;
      const result = await registerCloudJobAndApplication({
        origin: grant.origin,
        token: grant.token,
        accountId: grant.accountId,
        draft,
        selectedVariantId: selectedVariantId ?? undefined,
        signal: controller.signal,
      });
      if (accountRuntime.generation !== generation) {
        sendResponse({ ok: false, error: "aborted", status: 0 });
        return;
      }
      if (!result.ok && result.status === 401) {
        await writeStoredGrant(null);
        bumpAccountRuntime();
      }
      sendResponse(result);
    })();
    return true;
  }

  if (message?.type === "APPLYFLOW_MARK_CLOUD_SENT") {
    void (async () => {
      const grant = await readStoredGrant();
      if (!grant) {
        sendResponse({ ok: false, error: "signed_out", status: 401 });
        return;
      }
      const applicationId = typeof message.applicationId === "string" ? message.applicationId : "";
      const expectedVersion = typeof message.expectedVersion === "number" ? message.expectedVersion : 0;
      const confirmed = message.confirmedExternalSubmit === true;
      const generation = accountRuntime.generation;
      const result = await markCloudApplicationSent({
        origin: grant.origin,
        token: grant.token,
        applicationId,
        expectedVersion,
        confirmedExternalSubmit: confirmed,
      });
      if (accountRuntime.generation !== generation) {
        sendResponse({ ok: false, error: "aborted", status: 0 });
        return;
      }
      if (!result.ok && result.status === 401) {
        await writeStoredGrant(null);
        bumpAccountRuntime();
      }
      sendResponse(result);
    })();
    return true;
  }

  if (message?.type === GET_PUBLIC_SETTINGS_MESSAGE) {
    const parsed = parseGetPublicSettingsRequest(message);
    if (!parsed) {
      sendResponse({ ok: false, error: "invalid_message" });
      return false;
    }
    void handleGetPublicSettingsInServiceWorker()
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch(() => sendResponse({ ok: false, error: "internal_error" }));
    return true;
  }

  if (message?.type === GENERATE_AI_MESSAGE) {
    const parsed = parseGenerateAiRequest(message);
    if (!parsed) {
      sendResponse({ ok: false, error: "invalid_message" } satisfies GenerateAiResponse);
      return false;
    }
    void handleGenerateAiInServiceWorker(parsed)
      .then((response) => sendResponse(response))
      .catch(() =>
        sendResponse({ ok: false, error: "internal_error" } satisfies GenerateAiResponse),
      );
    return true;
  }

  if (message?.type === TEST_AI_MESSAGE) {
    if (!isExtensionPageSender(sender) && !isTrustedExtensionSender(sender)) {
      sendResponse({ ok: false, error: "unauthorized_sender" } satisfies TestAiResponse);
      return false;
    }
    const parsed = parseTestAiRequest(message);
    if (!parsed) {
      sendResponse({ ok: false, error: "invalid_message" } satisfies TestAiResponse);
      return false;
    }
    if (parsed.draftApiKey && !isExtensionPageSender(sender)) {
      sendResponse({ ok: false, error: "unauthorized_sender" } satisfies TestAiResponse);
      return false;
    }
    void handleTestAiInServiceWorker(parsed)
      .then((response) => sendResponse(response))
      .catch(() =>
        sendResponse({ ok: false, error: "provider_error", reason: "internal_error" } satisfies TestAiResponse),
      );
    return true;
  }

  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  void getApplyFlowPrivateSettings().catch(() => {
    /* ignore */
  });
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message?.type === "APPLYFLOW_ACCOUNT_STATUS") {
    void readStoredGrant().then((grant) => {
      sendResponse(statusPayload(grant));
    });
    return true;
  }
  if (message?.type === "APPLYFLOW_CLEAR_GRANT") {
    void writeStoredGrant(null).then(() => {
      bumpAccountRuntime();
      sendResponse({ cleared: true });
    });
    return true;
  }
  const accepted = acceptExternalGrant({
    message,
    senderUrl: sender.url,
    allowedOrigins: extensionAllowedOrigins,
  });
  if (!accepted.ok) {
    sendResponse({ ok: false });
    return false;
  }
  void (async () => {
    const previous = await readStoredGrant();
    const grant = replaceStoredGrant(previous, accepted.grant);
    if (previous && previous.accountId !== grant.accountId) {
      bumpAccountRuntime();
    }
    const account = await readExtensionAccount({ origin: grant.origin, token: grant.token });
    if (!account.ok || account.accountId !== grant.accountId) {
      await writeStoredGrant(null);
      bumpAccountRuntime();
      sendResponse({ ok: false, signedIn: false });
      return;
    }
    await writeStoredGrant(grant);
    bumpAccountRuntime();
    sendResponse({ ok: true, accountId: grant.accountId, signedIn: true });
  })();
  return true;
});
