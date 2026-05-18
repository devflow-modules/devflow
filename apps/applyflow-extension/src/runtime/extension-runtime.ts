/** Helpers puros para URLs e contexto chrome.runtime (content script + service worker). */

export function isValidExtensionUrl(url: string | undefined): url is string {
  return Boolean(
    url &&
      url.startsWith("chrome-extension://") &&
      !url.startsWith("chrome-extension://invalid"),
  );
}

export function getRuntime(): typeof chrome.runtime | undefined {
  return typeof chrome !== "undefined" ? chrome.runtime : undefined;
}

/**
 * Contexto de extensão activo. Após reload da extensão sem recarregar a aba do LinkedIn,
 * `getManifest()` falha e `getURL` pode devolver `chrome-extension://invalid/...`.
 */
export function hasValidExtensionContext(): boolean {
  const rt = getRuntime();
  if (!rt?.id) return false;
  try {
    void rt.getManifest();
    return true;
  } catch {
    return false;
  }
}

/** `getURL` só quando o contexto é válido; evita propagar `chrome-extension://invalid`. */
export function safeExtensionUrl(path: string): string | undefined {
  if (!hasValidExtensionContext()) return undefined;
  const rt = getRuntime();
  try {
    const url = rt?.getURL?.(path);
    return isValidExtensionUrl(url) ? url : undefined;
  } catch {
    return undefined;
  }
}
