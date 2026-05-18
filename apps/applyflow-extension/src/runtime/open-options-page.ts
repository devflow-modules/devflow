export const OPEN_OPTIONS_MESSAGE = "applyflow:open-options" as const;

export const OPEN_OPTIONS_MESSAGE_TIMEOUT_MS = 2000;

export type OpenOptionsResponse = { ok: true } | { ok: false; error?: string };

export function isValidExtensionUrl(url: string | undefined): url is string {
  return Boolean(
    url &&
      url.startsWith("chrome-extension://") &&
      !url.startsWith("chrome-extension://invalid"),
  );
}

function getRuntime(): typeof chrome.runtime | undefined {
  return typeof chrome !== "undefined" ? chrome.runtime : undefined;
}

/** Envia mensagem ao service worker com timeout; usa callback para `lastError`. */
export function sendOpenOptionsMessage(timeoutMs = OPEN_OPTIONS_MESSAGE_TIMEOUT_MS): Promise<
  OpenOptionsResponse | undefined
> {
  const rt = getRuntime();
  if (!rt?.sendMessage) {
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
        if (lastError) {
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

/** Fallback único no content script: abre URL de extensão válida numa nova aba. */
export function openOptionsViaValidatedWindowUrl(): boolean {
  const rt = getRuntime();
  const url = rt?.getURL?.("options.html");
  if (!isValidExtensionUrl(url)) {
    return false;
  }
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

/** Abre opções no contexto da extensão (service worker). */
export async function openOptionsPageInExtensionContext(): Promise<void> {
  const rt = getRuntime();
  if (!rt?.id) {
    throw new Error("Extension context unavailable");
  }

  if (rt.openOptionsPage) {
    try {
      await rt.openOptionsPage();
      return;
    } catch {
      /* tentar tab com URL válida */
    }
  }

  const url = rt.getURL("options.html");
  if (!isValidExtensionUrl(url)) {
    throw new Error("Invalid options page URL");
  }

  if (chrome.tabs?.create) {
    await chrome.tabs.create({ url });
    return;
  }

  throw new Error("No options page opener available");
}

let optionsOpenInFlight = false;

/**
 * Abre `options.html` a partir do painel injetado (content script).
 * Uma única tentativa por clique: mensagem ao SW → fallback seguro opcional.
 */
export async function openApplyFlowOptions(): Promise<void> {
  if (optionsOpenInFlight) return;
  optionsOpenInFlight = true;

  try {
    const rt = getRuntime();
    if (!rt?.id) {
      console.warn("[ApplyFlow] Extension context unavailable; reload the LinkedIn tab after updating the extension.");
      return;
    }

    const response = await sendOpenOptionsMessage();
    if (response?.ok === true) {
      return;
    }

    if (response?.ok === false && response.error) {
      console.warn("[ApplyFlow] Service worker could not open options:", response.error);
    }

    if (openOptionsViaValidatedWindowUrl()) {
      return;
    }

    console.warn(
      "[ApplyFlow] Could not open options page from the panel. Open via chrome://extensions → ApplyFlow → Details → Extension options.",
    );
  } finally {
    optionsOpenInFlight = false;
  }
}
