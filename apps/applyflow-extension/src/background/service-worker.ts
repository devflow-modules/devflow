import {
  OPEN_OPTIONS_MESSAGE,
  openOptionsPageInExtensionContext,
} from "../runtime/open-options-page.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== OPEN_OPTIONS_MESSAGE) return;
  void openOptionsPageInExtensionContext()
    .then(() => sendResponse({ ok: true }))
    .catch((err: unknown) =>
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  // Sprint 1: sem telemetria nem networking.
});
