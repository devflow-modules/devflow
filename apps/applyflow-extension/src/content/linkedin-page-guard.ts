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

/**
 * Local-only assistance fixture on the ApplyFlow dashboard origin.
 * Never enabled for production LinkedIn hosts.
 */
export function isApplyFlowLocalAssistanceFixture(
  href: string = typeof location !== "undefined" ? location.href : "",
): boolean {
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase();
    if (host !== "127.0.0.1" && host !== "localhost") return false;
    if (url.port !== "3010" && url.port !== "3012") return false;
    return url.pathname === "/extension-fixture" || url.pathname.startsWith("/extension-fixture/");
  } catch {
    return false;
  }
}

export function isApplyFlowAssistancePage(
  href: string = typeof location !== "undefined" ? location.href : "",
): boolean {
  return isApplyFlowSupportedLinkedInPage(href) || isApplyFlowLocalAssistanceFixture(href);
}
