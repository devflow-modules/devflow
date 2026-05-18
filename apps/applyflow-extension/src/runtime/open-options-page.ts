export const OPEN_OPTIONS_MESSAGE = "applyflow:open-options" as const;

/** Abre opções no contexto da extensão (service worker / página de extensão). */
export async function openOptionsPageInExtensionContext(): Promise<void> {
  const rt = typeof chrome !== "undefined" ? chrome.runtime : undefined;
  if (!rt) {
    throw new Error("chrome.runtime unavailable");
  }

  if (rt.openOptionsPage) {
    await rt.openOptionsPage();
    return;
  }

  const url = rt.getURL("options.html");
  if (url && chrome.tabs?.create) {
    await chrome.tabs.create({ url });
    return;
  }

  throw new Error("No options page opener available");
}

/**
 * Abre `options.html` a partir do painel injetado (content script / shadow DOM).
 * Delega ao service worker quando possível — `openOptionsPage` não é fiável no LinkedIn.
 */
export async function openApplyFlowOptions(): Promise<void> {
  const rt = typeof chrome !== "undefined" ? chrome.runtime : undefined;
  if (!rt) return;

  try {
    if (rt.sendMessage) {
      const res = (await rt.sendMessage({ type: OPEN_OPTIONS_MESSAGE })) as
        | { ok?: boolean }
        | undefined;
      if (res?.ok === true) return;
    }
  } catch {
    /* background indisponível — tentar localmente */
  }

  try {
    if (rt.openOptionsPage) {
      await rt.openOptionsPage();
      return;
    }
  } catch {
    /* fall through */
  }

  try {
    const url = rt.getURL?.("options.html");
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  } catch (error) {
    console.warn("[ApplyFlow] Failed to open options page", error);
  }
}
