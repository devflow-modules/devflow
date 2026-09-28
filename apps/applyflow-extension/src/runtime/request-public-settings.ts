import type { ApplyFlowPublicSettings } from "../storage/storage-types.js";
import { getRuntime, hasValidExtensionContext } from "./extension-runtime.js";
import { GET_PUBLIC_SETTINGS_MESSAGE } from "./ai-messages.js";

/**
 * Ask the service worker for sanitized public settings.
 * Prefer this from content scripts so SETTINGS is not read in the page-attached world
 * before legacy apiKey migration completes.
 */
export async function requestPublicSettings(): Promise<ApplyFlowPublicSettings> {
  const rt = getRuntime();
  if (!rt?.sendMessage || !hasValidExtensionContext()) {
    return { version: 1 };
  }

  return new Promise((resolve) => {
    try {
      rt.sendMessage({ type: GET_PUBLIC_SETTINGS_MESSAGE }, (response: unknown) => {
        if (chrome.runtime?.lastError || !response || typeof response !== "object") {
          resolve({ version: 1 });
          return;
        }
        const bag = response as { ok?: boolean; settings?: ApplyFlowPublicSettings };
        if (bag.ok && bag.settings?.version === 1) {
          resolve(bag.settings);
          return;
        }
        resolve({ version: 1 });
      });
    } catch {
      resolve({ version: 1 });
    }
  });
}
