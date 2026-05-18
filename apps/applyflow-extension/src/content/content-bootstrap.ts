import { hasValidExtensionContext } from "../runtime/extension-runtime.js";
import { initApplyFlowPanel, teardownApplyFlowPanel } from "./inject-applyflow-panel.js";
import { startApplyFlowObserver } from "./linkedin-easy-apply-detector.js";
import { isApplyFlowSupportedLinkedInPage } from "./linkedin-page-guard.js";
import { hookSpaNavigation } from "./spa-navigation.js";

let running = false;
let stopObserver: (() => void) | null = null;
let unhookHistory: (() => void) | null = null;

export function shouldActivateApplyFlowOnPage(href?: string): boolean {
  return isApplyFlowSupportedLinkedInPage(href) && hasValidExtensionContext();
}

export function stopApplyFlowContentScript(): void {
  if (!running) return;
  running = false;
  stopObserver?.();
  stopObserver = null;
  teardownApplyFlowPanel();
}

export function startApplyFlowContentScript(href?: string): void {
  if (running) return;
  const pageHref = href ?? (typeof location !== "undefined" ? location.href : "");
  if (!shouldActivateApplyFlowOnPage(pageHref)) return;

  running = true;
  void initApplyFlowPanel();
  stopObserver = startApplyFlowObserver({
    onDeactivate: stopApplyFlowContentScript,
  });
}

export function syncApplyFlowContentScript(href?: string): void {
  const pageHref = href ?? (typeof location !== "undefined" ? location.href : "");
  if (shouldActivateApplyFlowOnPage(pageHref)) {
    startApplyFlowContentScript(pageHref);
  } else {
    stopApplyFlowContentScript();
  }
}

/** Entry point do content script: activa só em `/jobs` e com contexto de extensão válido. */
export function bootstrapApplyFlowContentScript(): void {
  const onNavigate = () => syncApplyFlowContentScript();

  unhookHistory = hookSpaNavigation(onNavigate);
  window.addEventListener("popstate", onNavigate);
  document.addEventListener("visibilitychange", onNavigate);

  syncApplyFlowContentScript();
}
