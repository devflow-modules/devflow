/**
 * Páginas LinkedIn onde o painel Easy Apply / jobs faz sentido.
 * O manifest injecta em `linkedin.com/*`, mas o runtime ApplyFlow activa só aqui.
 */
export function isApplyFlowSupportedLinkedInPage(
  href: string = typeof location !== "undefined" ? location.href : "",
): boolean {
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase();
    if (host !== "www.linkedin.com" && !host.endsWith(".linkedin.com")) {
      return false;
    }
    const path = url.pathname;
    return path === "/jobs" || path.startsWith("/jobs/");
  } catch {
    return false;
  }
}
