/**
 * Debug logging safe for content script, options, and service worker.
 * Never logs secrets — callers must not pass apiKey / Authorization.
 */
const STORAGE_KEY = "APPLYFLOW_DEBUG";

function readFlag(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function applyFlowDebugEnabled(): boolean {
  return readFlag();
}

export function applyFlowDebugLog(...args: unknown[]): void {
  if (!applyFlowDebugEnabled()) return;
  console.info("[ApplyFlow]", ...args);
}
