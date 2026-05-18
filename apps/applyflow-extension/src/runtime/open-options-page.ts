import {
  getRuntime,
  hasValidExtensionContext,
  isValidExtensionUrl,
  safeExtensionUrl,
} from "./extension-runtime.js";

export const OPEN_OPTIONS_MESSAGE = "applyflow:open-options" as const;

export const OPEN_OPTIONS_MESSAGE_TIMEOUT_MS = 3000;

export type OpenOptionsResponse = { ok: true } | { ok: false; error?: string };

export { isValidExtensionUrl, hasValidExtensionContext, safeExtensionUrl };

/** Envia mensagem ao service worker com timeout; usa callback para `lastError`. */
export function sendOpenOptionsMessage(timeoutMs = OPEN_OPTIONS_MESSAGE_TIMEOUT_MS): Promise<
  OpenOptionsResponse | undefined
> {
  const rt = getRuntime();
  if (!rt?.sendMessage || !hasValidExtensionContext()) {
    return Promise.resolve(undefined);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: OpenOptionsResponse | undefined) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const timer = setTimeout(() => finish(undefined), timeoutMs);

    try {
      rt.sendMessage({ type: OPEN_OPTIONS_MESSAGE }, (response: OpenOptionsResponse | undefined) => {
        const lastError = chrome.runtime?.lastError;
        if (lastError && response === undefined) {
          finish(undefined);
          return;
        }
        finish(response);
      });
    } catch {
      finish(undefined);
    }
  });
}

/**
 * Fallback só no service worker — content script não deve chamar `getURL`/`window.open`
 * (contexto invalidado no LinkedIn gera `chrome-extension://invalid/` e ruído no console).
 */
export async function openOptionsViaExtensionTab(): Promise<boolean> {
  const url = safeExtensionUrl("options.html");
  if (!url || !chrome.tabs?.create) {
    return false;
  }
  await chrome.tabs.create({ url });
  return true;
}

/** Abre opções no contexto da extensão (service worker). */
export async function openOptionsPageInExtensionContext(): Promise<void> {
  if (!hasValidExtensionContext()) {
    throw new Error("Extension context unavailable");
  }

  const rt = getRuntime();
  if (!rt) {
    throw new Error("chrome.runtime unavailable");
  }

  if (rt.openOptionsPage) {
    try {
      await rt.openOptionsPage();
      return;
    } catch {
      /* tentar tab com URL válida */
    }
  }

  if (await openOptionsViaExtensionTab()) {
    return;
  }

  throw new Error("No options page opener available");
}

let optionsOpenInFlight = false;

/**
 * Abre `options.html` a partir do painel injetado (content script).
 * Uma mensagem ao SW por clique — sem `getURL`/`window.open` no LinkedIn.
 */
export async function openApplyFlowOptions(): Promise<void> {
  if (optionsOpenInFlight) return;
  optionsOpenInFlight = true;

  try {
    if (!hasValidExtensionContext()) {
      console.warn(
        "[ApplyFlow] Extension context unavailable; reload the LinkedIn tab after updating the extension.",
      );
      return;
    }

    const response = await sendOpenOptionsMessage();
    if (response?.ok === true) {
      return;
    }

    if (response?.ok === false && response.error) {
      console.warn("[ApplyFlow] Service worker could not open options:", response.error);
    }

    console.warn(
      "[ApplyFlow] Could not open options from the panel. Open via chrome://extensions → ApplyFlow → Details → Extension options.",
    );
  } finally {
    optionsOpenInFlight = false;
  }
}
