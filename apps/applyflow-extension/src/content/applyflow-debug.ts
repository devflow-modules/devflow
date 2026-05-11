const STORAGE_KEY = "APPLYFLOW_DEBUG";

function readFlag(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Logs só quando `localStorage.APPLYFLOW_DEBUG === "true"` na origem linkedin.com.
 */
export function applyFlowDebugEnabled(): boolean {
  return readFlag();
}

export function applyFlowDebugLog(...args: unknown[]): void {
  if (!applyFlowDebugEnabled()) return;
  console.info("[ApplyFlow]", ...args);
}
