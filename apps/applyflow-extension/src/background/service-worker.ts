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
    // Options / extension pages only — never from arbitrary content smuggling draft keys elsewhere
    // beyond same-extension trusted sender. Content may also lack draftApiKey (unused path).
    if (!isExtensionPageSender(sender) && !isTrustedExtensionSender(sender)) {
      sendResponse({ ok: false, error: "unauthorized_sender" } satisfies TestAiResponse);
      return false;
    }
    const parsed = parseTestAiRequest(message);
    if (!parsed) {
      sendResponse({ ok: false, error: "invalid_message" } satisfies TestAiResponse);
      return false;
    }
    // Prefer extension-page senders for draft keys; content without draft still denied conceptually
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
  // Migrate legacy apiKey off SETTINGS into credential bag (no delete).
  void getApplyFlowPrivateSettings().catch(() => {
    /* ignore */
  });
});
