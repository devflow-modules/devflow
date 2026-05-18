import {
  OPEN_OPTIONS_MESSAGE,
  type OpenOptionsResponse,
  openOptionsPageInExtensionContext,
} from "../runtime/open-options-page.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== OPEN_OPTIONS_MESSAGE) {
    return false;
  }

  void openOptionsPageInExtensionContext()
    .then(() => sendResponse({ ok: true } satisfies OpenOptionsResponse))
    .catch((err: unknown) => {
      const error = err instanceof Error ? err.message : String(err);
      sendResponse({ ok: false, error } satisfies OpenOptionsResponse);
    });

  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  // Sprint 1: sem telemetria nem networking.
});
